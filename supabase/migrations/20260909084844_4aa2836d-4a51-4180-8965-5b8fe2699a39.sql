CREATE TABLE public.analyzer_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  host text,
  page_title text,
  overall_score integer,
  seo_score integer,
  ai_score integer,
  technical_score integer,
  issue_count integer,
  top_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  email text,
  user_id uuid,
  user_email text,
  referrer text,
  user_agent text,
  language text,
  status text NOT NULL DEFAULT 'new',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.analyzer_leads TO authenticated;
GRANT ALL ON public.analyzer_leads TO service_role;

ALTER TABLE public.analyzer_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analyzer leads"
  ON public.analyzer_leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update analyzer leads"
  ON public.analyzer_leads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete analyzer leads"
  ON public.analyzer_leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX analyzer_leads_created_at_idx ON public.analyzer_leads (created_at DESC);
CREATE INDEX analyzer_leads_host_idx ON public.analyzer_leads (host);

CREATE TRIGGER update_analyzer_leads_updated_at
  BEFORE UPDATE ON public.analyzer_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();