
-- Indexing requests table
CREATE TYPE public.indexing_status AS ENUM ('pending', 'submitted', 'indexed', 'failed');

CREATE TABLE public.indexing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status public.indexing_status NOT NULL DEFAULT 'pending',
  google_response JSONB,
  error_message TEXT,
  submitted_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indexing_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own indexing requests"
  ON public.indexing_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own indexing requests"
  ON public.indexing_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own indexing requests"
  ON public.indexing_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own indexing requests"
  ON public.indexing_requests FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add google indexing config to websites (store service account JSON)
ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS google_indexing_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_service_account JSONB;

-- Enable realtime for indexing status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.indexing_requests;
