-- OfertaFlow — cadência mínima de cinco minutos para todos os nichos.
-- Não agenda nem envia mensagens; apenas atualiza configuração e validação do banco.
begin;
alter table public.niches drop constraint if exists niches_interval_minutes_check;
alter table public.niches
  add constraint niches_interval_minutes_check
  check (interval_minutes between 5 and 1440);
update public.niches set interval_minutes = 5 where interval_minutes <> 5;
commit;
notify pgrst, 'reload schema';
