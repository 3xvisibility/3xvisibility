
-- Create the pgp_keywords table for Page Generator Pro Keywords
CREATE TABLE public.pgp_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'local',
  terms TEXT[] NOT NULL DEFAULT '{}',
  delimiter TEXT DEFAULT NULL,
  columns TEXT[] DEFAULT '{}',
  source_config JSONB DEFAULT '{}',
  term_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Enable RLS
ALTER TABLE public.pgp_keywords ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view workspace keywords"
ON public.pgp_keywords FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace keywords"
ON public.pgp_keywords FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace keywords"
ON public.pgp_keywords FOR UPDATE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace keywords"
ON public.pgp_keywords FOR DELETE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

-- Auto-update updated_at
CREATE TRIGGER update_pgp_keywords_updated_at
BEFORE UPDATE ON public.pgp_keywords
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast workspace lookups
CREATE INDEX idx_pgp_keywords_workspace ON public.pgp_keywords(workspace_id);
