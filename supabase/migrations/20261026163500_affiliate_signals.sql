alter table public.affiliate_products
 add column if not exists commission_rate numeric(8,5),
 add column if not exists commission_verified_at timestamptz,
 add column if not exists sales_count integer,
 add column if not exists sales_verified_at timestamptz;
notify pgrst,'reload schema';