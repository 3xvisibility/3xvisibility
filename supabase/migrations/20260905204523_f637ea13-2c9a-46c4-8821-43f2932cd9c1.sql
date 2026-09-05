CREATE TABLE public.tracked_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  keyword text NOT NULL,
  target_url text,
  country text NOT NULL DEFAULT 'us',
  search_volume integer NOT NULL DEFAULT 0,
  difficulty integer NOT NULL DEFAULT 0,
  current_position integer,
  previous_position integer,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracked_keywords TO authenticated;
GRANT ALL ON public.tracked_keywords TO service_role;

ALTER TABLE public.tracked_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage tracked keywords"
  ON public.tracked_keywords FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER enforce_workspace_id_tracked_keywords
  BEFORE INSERT OR UPDATE ON public.tracked_keywords
  FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_id();

CREATE TRIGGER update_tracked_keywords_updated_at
  BEFORE UPDATE ON public.tracked_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.keyword_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  keyword_id uuid NOT NULL REFERENCES public.tracked_keywords(id) ON DELETE CASCADE,
  position integer NOT NULL,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_rankings TO authenticated;
GRANT ALL ON public.keyword_rankings TO service_role;

ALTER TABLE public.keyword_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage keyword rankings"
  ON public.keyword_rankings FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE INDEX idx_keyword_rankings_keyword ON public.keyword_rankings (keyword_id, recorded_at DESC);

CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  user_id uuid NOT NULL,
  domain text NOT NULL,
  label text,
  authority_score integer NOT NULL DEFAULT 0,
  organic_keywords integer NOT NULL DEFAULT 0,
  organic_traffic integer NOT NULL DEFAULT 0,
  backlinks integer NOT NULL DEFAULT 0,
  is_self boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;

ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage competitors"
  ON public.competitors FOR ALL TO authenticated
  USING (public.is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER enforce_workspace_id_competitors
  BEFORE INSERT OR UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_id();

CREATE TRIGGER update_competitors_updated_at
  BEFORE UPDATE ON public.competitors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();