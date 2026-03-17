ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS publish_mode text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS max_rows integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz DEFAULT NULL;