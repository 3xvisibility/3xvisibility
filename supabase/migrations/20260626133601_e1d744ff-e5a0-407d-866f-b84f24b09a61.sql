CREATE INDEX IF NOT EXISTS idx_campaigns_status_scheduled_at
  ON public.campaigns (status, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_status_updated_at
  ON public.campaigns (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_generation_jobs_campaign_status
  ON public.generation_jobs (campaign_id, status);

CREATE INDEX IF NOT EXISTS idx_generated_pages_workspace_created_at
  ON public.generated_pages (workspace_id, created_at DESC);