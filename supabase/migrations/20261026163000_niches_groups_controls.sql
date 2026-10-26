-- OfertaFlow: controle de intenção de publicação, capacidade dos grupos e redirecionamentos.
-- Não autoriza envio WhatsApp, não cria grupos remotamente e não usa dados pessoais.
alter table public.niches
  add column if not exists auto_publish_enabled boolean not null default false;
alter table public.whatsapp_groups
  add column if not exists member_count integer,
  add column if not exists capacity_limit integer,
  add column if not exists capacity_updated_at timestamptz,
  add column if not exists is_full boolean not null default false;

alter table public.whatsapp_groups
  drop constraint if exists whatsapp_groups_capacity_valid;
alter table public.whatsapp_groups
  add constraint whatsapp_groups_capacity_valid
  check (member_count is null or member_count >= 0)
  not valid;
alter table public.whatsapp_groups validate constraint whatsapp_groups_capacity_valid;
alter table public.whatsapp_groups
  drop constraint if exists whatsapp_groups_limit_valid;
alter table public.whatsapp_groups
  add constraint whatsapp_groups_limit_valid
  check (capacity_limit is null or capacity_limit between 2 and 10000)
  not valid;
alter table public.whatsapp_groups validate constraint whatsapp_groups_limit_valid;

create table if not exists public.group_invite_clicks (
 id uuid primary key default gen_random_uuid(),
 niche_id uuid not null references public.niches(id),
 group_id uuid not null references public.whatsapp_groups(id),
 created_at timestamptz not null default now()
);
create index if not exists group_invite_clicks_group_time_idx on public.group_invite_clicks(group_id,created_at desc);
create index if not exists group_invite_clicks_niche_time_idx on public.group_invite_clicks(niche_id,created_at desc);

create table if not exists public.group_expansion_requests (
 id uuid primary key default gen_random_uuid(),
 niche_id uuid not null references public.niches(id),
 status text not null default 'pending' check (status in ('pending','resolved')),
 reason text not null default 'no_available_group',
 created_at timestamptz not null default now(),
 resolved_at timestamptz
);
create unique index if not exists group_expansion_pending_uidx
 on public.group_expansion_requests(niche_id) where status='pending';
create index if not exists group_expansion_requests_status_idx on public.group_expansion_requests(status);

alter table public.group_invite_clicks enable row level security;
alter table public.group_expansion_requests enable row level security;
create policy "admin_all_group_invite_clicks" on public.group_invite_clicks
 for all to authenticated
 using (exists(select 1 from public.admin_users where user_id=(select auth.uid())))
 with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create policy "admin_all_group_expansion_requests" on public.group_expansion_requests
 for all to authenticated
 using (exists(select 1 from public.admin_users where user_id=(select auth.uid())))
 with check (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
grant select,insert,update,delete on public.group_invite_clicks, public.group_expansion_requests to authenticated,service_role;
revoke all on public.group_invite_clicks, public.group_expansion_requests from anon;
notify pgrst,'reload schema';
