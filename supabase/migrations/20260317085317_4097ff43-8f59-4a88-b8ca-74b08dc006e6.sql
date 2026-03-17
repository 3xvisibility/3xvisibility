
-- Campaign logs table for tracking generation events
CREATE TABLE public.campaign_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  event TEXT NOT NULL,
  message TEXT,
  batch_number INTEGER,
  pages_in_batch INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own logs
CREATE POLICY "Users can view own campaign logs"
  ON public.campaign_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service can insert campaign logs"
  ON public.campaign_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Add batch tracking columns to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS current_batch INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;

-- Enable realtime for campaigns to track progress
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
