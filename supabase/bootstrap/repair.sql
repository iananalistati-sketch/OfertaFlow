-- OfertaFlow v1.0 • aplicar no Supabase SQL Editor, depois criar o administrador
-- Reparação idempotente da base OfertaFlow. Não apaga, renomeia ou trunca dados.
create extension if not exists pgcrypto;
create table if not exists public.admin_users(user_id uuid primary key references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists public.affiliate_accounts(id uuid primary key default gen_random_uuid(),provider text not null check(provider in('shopee','aliexpress','manual')),display_name text not null,status text not null default 'pending' check(status in('pending','approved','disabled')),created_at timestamptz not null default now());
create table if not exists public.niches(id uuid primary key default gen_random_uuid(),slug text unique not null,name text not null,emoji text not null default '🏷️',interval_minutes integer not null default 60 check(interval_minutes between 15 and 1440),is_active boolean not null default true,created_at timestamptz not null default now());
create table if not exists public.whatsapp_groups(id uuid primary key default gen_random_uuid(),niche_id uuid not null references public.niches(id),name text not null,invite_url text check(invite_url is null or invite_url ~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9]+$'),is_active boolean not null default false,auto_publish boolean not null default false,channel_verified boolean not null default false,created_at timestamptz not null default now(),constraint publish_only_verified check(not auto_publish or channel_verified));
create table if not exists public.subscribers(id uuid primary key default gen_random_uuid(),name text not null,phone_e164 text unique not null,consent_at timestamptz not null,consent_source text not null,revoked_at timestamptz,created_at timestamptz not null default now());
create table if not exists public.subscriber_niches(subscriber_id uuid not null references public.subscribers(id) on delete cascade,niche_id uuid not null references public.niches(id) on delete cascade,created_at timestamptz not null default now(),primary key(subscriber_id,niche_id));
create table if not exists public.affiliate_products(id uuid primary key default gen_random_uuid(),account_id uuid references public.affiliate_accounts(id),external_id text,title text not null,description text,image_url text,price numeric(12,2) check(price>=0),currency text not null default 'BRL',affiliate_url text,source text not null,offer_verified_at timestamptz,status text not null default 'draft' check(status in('draft','ready','expired')),created_at timestamptz not null default now());
create unique index if not exists affiliate_products_provider_uidx on public.affiliate_products(account_id,external_id) where account_id is not null and external_id is not null;
create table if not exists public.product_niches(product_id uuid not null references public.affiliate_products(id) on delete cascade,niche_id uuid not null references public.niches(id) on delete cascade,primary key(product_id,niche_id));
create table if not exists public.campaigns(id uuid primary key default gen_random_uuid(),product_id uuid not null references public.affiliate_products(id),copy_text text not null,approved boolean not null default false,created_at timestamptz not null default now());
create table if not exists public.publication_queue(id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.campaigns(id),group_id uuid not null references public.whatsapp_groups(id),scheduled_at timestamptz not null,status text not null default 'pending' check(status in('pending','blocked','sent','failed')),attempts integer not null default 0,created_at timestamptz not null default now());
create table if not exists public.publication_logs(id uuid primary key default gen_random_uuid(),queue_id uuid not null references public.publication_queue(id),event text not null,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create table if not exists public.click_events(id uuid primary key default gen_random_uuid(),campaign_id uuid references public.campaigns(id),clicked_at timestamptz not null default now());
-- Todas as tabelas permanecem privadas para acesso direto da API pública.
do $$ declare t text; begin foreach t in array array['admin_users','affiliate_accounts','niches','whatsapp_groups','subscribers','subscriber_niches','affiliate_products','product_niches','campaigns','publication_queue','publication_logs','click_events'] loop execute format('alter table public.%I enable row level security',t); end loop; end $$;
-- Apenas administradores autorizados podem ler/editar dados via cliente autenticado.
-- admin_users tem política restrita ao próprio registro para evitar recursão.
do $$ begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='admin_users' and policyname='admin_self_read') then
   create policy admin_self_read on public.admin_users for select to authenticated using(user_id=(select auth.uid()));
 end if;
end $$;
-- Demais tabelas: acesso exclusivamente a administradores autenticados.
do $$ declare t text; p text; begin
 foreach t in array array['affiliate_accounts','niches','whatsapp_groups','subscribers','subscriber_niches','affiliate_products','product_niches','campaigns','publication_queue','publication_logs','click_events'] loop
   p := 'admin_all_' || t;
   if not exists(select 1 from pg_policies where schemaname='public' and tablename=t and policyname=p) then
     execute format('create policy %I on public.%I for all to authenticated using(exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()))) with check(exists(select 1 from public.admin_users a where a.user_id=(select auth.uid())))',p,t);
   end if;
 end loop;
end $$;
-- RLS protege o conteúdo; GRANT permite que a API autenticada avalie as políticas.
grant usage on schema public to authenticated;
grant select on public.admin_users to authenticated;
do $$ declare t text; begin
 foreach t in array array['affiliate_accounts','niches','whatsapp_groups','subscribers','subscriber_niches','affiliate_products','product_niches','campaigns','publication_queue','publication_logs','click_events'] loop
   execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
insert into public.niches(slug,name,emoji,interval_minutes) values('tecnologia','Tecnologia','💻',60),('games','Games','🎮',60),('casa','Casa','🏠',60),('todas-ofertas','Todas as Ofertas','🔥',30) on conflict(slug) do nothing;
-- Sem grupos, links ou produtos reais previamente cadastrados. Nunca ativar envio automático por default.

-- Atualiza o cache do PostgREST, importante para PGRST205.
notify pgrst, 'reload schema';
