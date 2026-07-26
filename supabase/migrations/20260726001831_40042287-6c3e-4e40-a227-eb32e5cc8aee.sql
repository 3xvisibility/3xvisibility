-- Debug clone of a failing campaign into the test workspace so the generation
-- pipeline can be reproduced end-to-end.
insert into public.templates (id, user_id, workspace_id, name, content, schema_config, seo_title_pattern, seo_description_pattern, schema_type)
select '11111111-1111-4111-8111-111111111111', '9a15fce8-a8ab-4885-9a35-868bf9652d6e', 'd3e1153b-5798-4937-8354-2440bfc67bcf', 'DEBUG clone', content, schema_config, seo_title_pattern, seo_description_pattern, schema_type
from public.templates where id='25a8f9e1-4787-4628-b317-c4a0cb21528d'
on conflict (id) do nothing;

insert into public.campaigns (id, user_id, workspace_id, name, template_id, website_id, status, csv_data, mapping, total_rows, processed_rows, failed_rows, batch_size, current_batch, is_paused, campaign_type, utm_settings, geo_settings, publish_mode, max_rows, generation_method, directory_structure, language, country, publish_type, publish_format, design_mode, keyword_source, keyword_source_details)
select '22222222-2222-4222-8222-222222222222', '9a15fce8-a8ab-4885-9a35-868bf9652d6e', 'd3e1153b-5798-4937-8354-2440bfc67bcf', 'DEBUG clone campaign', '11111111-1111-4111-8111-111111111111', null, 'queued', csv_data, mapping, total_rows, 0, 0, batch_size, 0, false, campaign_type, utm_settings, geo_settings, publish_mode, max_rows, generation_method, directory_structure, language, country, publish_type, publish_format, design_mode, keyword_source, keyword_source_details
from public.campaigns where id='a3d34a18-4d8c-4853-ad27-3482bcdac196'
on conflict (id) do nothing;