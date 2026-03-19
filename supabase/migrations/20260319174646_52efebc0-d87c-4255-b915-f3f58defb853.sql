
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS directory_structure jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS author_rotation jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS drip_feed_settings jsonb DEFAULT NULL;

COMMENT ON COLUMN public.campaigns.directory_structure IS 'Hierarchical URL nesting config e.g. {"levels": ["state","county","city"], "separator": "/"}';
COMMENT ON COLUMN public.campaigns.author_rotation IS 'Author rotation config e.g. {"enabled": true, "authors": ["Author1","Author2"]}';
COMMENT ON COLUMN public.campaigns.drip_feed_settings IS 'Drip feed scheduling e.g. {"enabled": true, "interval_hours": 24, "start_date": "2025-01-01"}';
