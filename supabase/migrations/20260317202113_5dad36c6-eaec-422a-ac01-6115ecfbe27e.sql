
-- Create table to store raw CSV content separately from campaigns
CREATE TABLE IF NOT EXISTS public.campaign_csv_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  raw_content TEXT NOT NULL,
  headers JSONB,
  row_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_csv_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own CSV files"
ON public.campaign_csv_files FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members can read workspace CSV files"
ON public.campaign_csv_files FOR SELECT TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can delete their own CSV files"
ON public.campaign_csv_files FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_csv_files_campaign ON public.campaign_csv_files(campaign_id);
