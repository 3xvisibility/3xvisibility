
-- 1. Add canonical_url to generated_pages
ALTER TABLE public.generated_pages ADD COLUMN IF NOT EXISTS canonical_url TEXT;

-- 2. Add ad_campaign_id and ad_group_id to generated_pages for SEA traceability
ALTER TABLE public.generated_pages ADD COLUMN IF NOT EXISTS ad_campaign_id TEXT;
ALTER TABLE public.generated_pages ADD COLUMN IF NOT EXISTS ad_group_id TEXT;

-- 3. Create audit_logs table for tenant-scoped audit logging
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_audit_logs_workspace ON public.audit_logs(workspace_id, created_at DESC);

-- 4. Add csv_storage_path to campaigns for cloud CSV storage
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS csv_storage_path TEXT;
