-- Aplicada ao projeto Supabase pbualjlqihfncjzuxnrt em 2026-10-22.
-- A lista de e-mails autorizados fica em schema não exposto, e a promoção ocorre
-- SOMENTE quando o Supabase autentica e confirma o e-mail do usuário.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create table if not exists app_private.admin_email_allowlist (
 email text primary key,
 created_at timestamptz not null default now()
);
revoke all on app_private.admin_email_allowlist from public, anon, authenticated;
-- A autorização da conta principal deve ser cadastrada com privilégios administrativos,
-- sem publicar endereços de e-mail pessoais no repositório.
-- A conta do OfertaFlow foi autorizada diretamente no projeto conectado.
create or replace function app_private.promote_verified_admin()
returns trigger language plpgsql security definer set search_path=''
as $func$
begin
 if new.email_confirmed_at is not null and exists (
   select 1 from app_private.admin_email_allowlist where email=lower(new.email)
 ) then
   insert into public.admin_users(user_id) values(new.id) on conflict(user_id) do nothing;
 end if;
 return new;
end;
$func$;
revoke all on function app_private.promote_verified_admin() from public, anon, authenticated;
drop trigger if exists ofertaflow_authorize_admin on auth.users;
create trigger ofertaflow_authorize_admin
after insert or update of email_confirmed_at, email on auth.users
for each row execute function app_private.promote_verified_admin();
-- A sincronização de usuários já verificados deve ocorrer por operação administrativa,
-- com a mesma verificação de posse do e-mail usada no trigger.
