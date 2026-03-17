
ALTER TABLE public.templates
  ADD COLUMN seo_title_pattern TEXT DEFAULT '',
  ADD COLUMN seo_description_pattern TEXT DEFAULT '',
  ADD COLUMN schema_type TEXT DEFAULT 'WebPage',
  ADD COLUMN schema_config JSONB DEFAULT '{}'::jsonb;
