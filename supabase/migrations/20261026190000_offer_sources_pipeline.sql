-- OfertaFlow: arquitetura de captação em grupos/fontes e conversão de links.
-- Estes registros NÃO conectam ao WhatsApp nem implementam coleta de mensagens.
create table if not exists public.offer_sources (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 3 and 120),
  source_kind text not null check (source_kind in ('group_reference','authorized_feed','authorized_webhook')),
  niche_id uuid references public.niches(id) on delete set null,
  collection_enabled boolean not null default false,
  capability_verified boolean not null default false,
  status text not null default 'not_connected'
    check(status in ('not_connected','awaiting_permission','ready','disabled')),
  created_at timestamptz not null default now(),
  constraint offer_sources_safe_activation check (
    not collection_enabled or (capability_verified and status='ready')
  )
);
create index if not exists offer_sources_niche_idx on public.offer_sources(niche_id);

create table if not exists public.captured_offers (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.offer_sources(id) on delete restrict,
  external_event_id text not null check(char_length(external_event_id) between 1 and 160),
  marketplace text not null check(marketplace in ('mercadolivre','shopee','amazon','aliexpress','unknown')),
  product_title text not null check(char_length(product_title) between 2 and 300),
  original_product_url text,
  original_affiliate_url text,
  owner_affiliate_url text,
  image_url text,
  price numeric(12,2) check(price >= 0),
  affiliate_link_verified_at timestamptz,
  offer_verified_at timestamptz,
  conversion_status text not null default 'pending'
    check(conversion_status in ('pending','converted','blocked')),
  blocked_reason text,
  created_at timestamptz not null default now(),
  unique(source_id,external_event_id),
  constraint converted_must_be_verified check(
    conversion_status <> 'converted'
    or (owner_affiliate_url is not null and affiliate_link_verified_at is not null)
  )
);
create index if not exists captured_offers_created_idx on public.captured_offers(created_at desc);
create index if not exists captured_offers_status_idx on public.captured_offers(conversion_status);

alter table public.offer_sources enable row level security;
alter table public.captured_offers enable row level security;
do $$ declare t text; begin
 foreach t in array array['offer_sources','captured_offers'] loop
   if not exists (select 1 from pg_policies
                  where schemaname='public' and tablename=t and policyname='admin_all_'||t) then
     execute format(
       'create policy %I on public.%I for all to authenticated
        using (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))
        with check (exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))',
       'admin_all_'||t,t
     );
   end if;
   execute format('revoke all on public.%I from anon',t);
   execute format('grant select,insert,update,delete on public.%I to authenticated,service_role',t);
 end loop;
end $$;
notify pgrst,'reload schema';
