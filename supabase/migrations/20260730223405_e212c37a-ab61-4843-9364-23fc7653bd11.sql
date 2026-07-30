-- Extend sitemaps for per-campaign scoping and index tooling results
ALTER TABLE public.sitemaps
  ADD COLUMN IF NOT EXISTS campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sitemap_url text,
  ADD COLUMN IF NOT EXISTS indexnow_key text,
  ADD COLUMN IF NOT EXISTS last_ping_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_ping_result jsonb,
  ADD COLUMN IF NOT EXISTS robots_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS robots_result jsonb;

ALTER TABLE public.sitemaps DROP CONSTRAINT IF EXISTS sitemaps_website_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS sitemaps_website_campaign_uidx
  ON public.sitemaps (website_id, COALESCE(campaign_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Audit trail of sitemap / indexnow / robots operations
CREATE TABLE IF NOT EXISTS public.site_index_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  website_id uuid NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('sitemap','indexnow','robots')),
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success','partial','failed')),
  url_count integer NOT NULL DEFAULT 0,
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_index_events_website_idx ON public.site_index_events (website_id, created_at DESC);
CREATE INDEX IF NOT EXISTS site_index_events_campaign_idx ON public.site_index_events (campaign_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_index_events TO authenticated;
GRANT ALL ON public.site_index_events TO service_role;

ALTER TABLE public.site_index_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace index events"
ON public.site_index_events FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace index events"
ON public.site_index_events FOR INSERT TO authenticated
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can delete workspace index events"
ON public.site_index_events FOR DELETE TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));