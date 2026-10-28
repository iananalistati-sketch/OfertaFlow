-- Unicidade completa para upsert idempotente por conta afiliada e produto.
-- NULL permanece permitido para registros legados ainda sem conta.
do $$
begin
 if not exists (
  select 1 from pg_constraint
   where conrelid='public.affiliate_products'::regclass
   and conname='affiliate_products_account_external_unique'
 ) then
   alter table public.affiliate_products
     add constraint affiliate_products_account_external_unique
     unique (account_id, external_id);
 end if;
end $$;
notify pgrst,'reload schema';