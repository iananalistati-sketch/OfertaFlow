-- Aplicada ao Supabase OfertaFlow em 2026-10-22.
-- Informações opcionais de promoções: nunca preencher valores fictícios em produção.
alter table public.affiliate_products
 add column if not exists original_price numeric(12,2),
 add column if not exists pix_price numeric(12,2),
 add column if not exists installment_total numeric(12,2),
 add column if not exists installment_count integer,
 add column if not exists coupon_code text,
 add column if not exists coupon_verified_at timestamptz,
 add column if not exists offer_expires_at timestamptz;

alter table public.affiliate_products
 add constraint affiliate_products_original_price_nonnegative check (original_price is null or original_price>=0),
 add constraint affiliate_products_pix_price_nonnegative check (pix_price is null or pix_price>=0),
 add constraint affiliate_products_installment_total_nonnegative check (installment_total is null or installment_total>=0),
 add constraint affiliate_products_installment_count_valid check (installment_count is null or installment_count between 1 and 24);
comment on column public.affiliate_products.offer_verified_at is 'Momento da última validação real do preço, estoque e link comissionado; preenchido só pelo conector confiável.';
comment on column public.affiliate_products.coupon_verified_at is 'Momento de verificação do cupom; nunca exibir cupom desatualizado.';
notify pgrst,'reload schema';
