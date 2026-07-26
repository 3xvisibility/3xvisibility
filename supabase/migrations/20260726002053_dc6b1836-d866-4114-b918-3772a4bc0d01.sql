update public.campaigns
set status = 'queued', is_paused = false, current_batch = 0, processed_rows = 0, failed_rows = 0
where id in ('a3d34a18-4d8c-4853-ad27-3482bcdac196','870549b3-356c-4f18-bf20-3e97c779994b');

update public.generation_jobs set status = 'failed'
where campaign_id in ('a3d34a18-4d8c-4853-ad27-3482bcdac196','870549b3-356c-4f18-bf20-3e97c779994b')
  and status not in ('completed','failed');

delete from public.generated_pages where campaign_id = '22222222-2222-4222-8222-222222222222';
delete from public.campaign_logs where campaign_id = '22222222-2222-4222-8222-222222222222';
delete from public.generation_jobs where campaign_id = '22222222-2222-4222-8222-222222222222';
delete from public.campaigns where id = '22222222-2222-4222-8222-222222222222';
delete from public.templates where id = '11111111-1111-4111-8111-111111111111';