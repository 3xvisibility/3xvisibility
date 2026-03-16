
-- Internal link settings per campaign
CREATE TABLE public.internal_link_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  max_links_per_page INTEGER NOT NULL DEFAULT 5,
  section_title TEXT NOT NULL DEFAULT 'Related Pages',
  anchor_format TEXT NOT NULL DEFAULT '{title}',
  grouping_variable TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

-- Internal link relationships
CREATE TABLE public.internal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE NOT NULL,
  target_page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  anchor_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (source_page_id, target_page_id)
);

-- RLS
ALTER TABLE public.internal_link_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own internal link settings"
  ON public.internal_link_settings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own internal links"
  ON public.internal_links
  FOR ALL
  TO authenticated
  USING (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()))
  WITH CHECK (campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = auth.uid()));

-- Indexes for performance
CREATE INDEX idx_internal_links_campaign ON public.internal_links(campaign_id);
CREATE INDEX idx_internal_links_source ON public.internal_links(source_page_id);
CREATE INDEX idx_internal_link_settings_campaign ON public.internal_link_settings(campaign_id);
