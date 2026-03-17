
CREATE TABLE public.sitemaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID REFERENCES public.websites(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  page_count INTEGER NOT NULL DEFAULT 0,
  last_generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(website_id)
);

ALTER TABLE public.sitemaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sitemaps"
  ON public.sitemaps FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sitemaps"
  ON public.sitemaps FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sitemaps"
  ON public.sitemaps FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sitemaps"
  ON public.sitemaps FOR DELETE TO authenticated
  USING (user_id = auth.uid());
