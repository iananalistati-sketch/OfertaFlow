create index if not exists campaigns_product_id_idx on public.campaigns(product_id);
create index if not exists click_events_campaign_id_idx on public.click_events(campaign_id);
create index if not exists product_niches_niche_id_idx on public.product_niches(niche_id);
create index if not exists publication_logs_queue_id_idx on public.publication_logs(queue_id);
create index if not exists publication_queue_campaign_id_idx on public.publication_queue(campaign_id);
create index if not exists publication_queue_group_id_idx on public.publication_queue(group_id);
create index if not exists subscriber_niches_niche_id_idx on public.subscriber_niches(niche_id);
create index if not exists whatsapp_groups_niche_id_idx on public.whatsapp_groups(niche_id);
