-- Origem de eventos autenticada, auditoria, classificação e idempotência.
-- Chaves aleatórias por origem nunca são armazenadas em texto.
alter table public.offer_sources
  add column if not exists webhook_token_hash text unique
    check(webhook_token_hash is null or webhook_token_hash ~ '^[a-f0-9]{64}$'),
  add column if not exists last_received_at timestamptz;

create unique index if not exists offer_sources_webhook_hash_unique
  on public.offer_sources(webhook_token_hash) where webhook_token_hash is not null;

alter table public.captured_offers
  add column if not exists original_price numeric(12,2) check(original_price >= 0),
  add column if not exists coupon_code text check(coupon_code is null or char_length(coupon_code) <= 32),
  add column if not exists suggested_niches text[] not null default '{}',
  add column if not exists is_test boolean not null default false;

-- Endpoint só aceita eventos da fonte autorizada; a tabela nunca se torna pública.
alter table public.offer_sources enable row level security;
alter table public.captured_offers enable row level security;
revoke all on public.offer_sources from anon;
revoke all on public.captured_offers from anon;
notify pgrst, 'reload schema';