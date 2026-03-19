
-- Page performance metrics table
CREATE TABLE public.page_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID REFERENCES public.generated_pages(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  avg_time_on_page NUMERIC NOT NULL DEFAULT 0,
  bounce_rate NUMERIC NOT NULL DEFAULT 0,
  click_through_rate NUMERIC NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.page_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace page_metrics"
  ON public.page_metrics FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace page_metrics"
  ON public.page_metrics FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace page_metrics"
  ON public.page_metrics FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Shared templates for marketplace
CREATE TABLE public.shared_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES public.templates(id) ON DELETE CASCADE NOT NULL,
  workspace_id UUID REFERENCES public.workspaces(id),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Anonymous',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[] NOT NULL DEFAULT '{}',
  content TEXT NOT NULL,
  variables TEXT[] NOT NULL DEFAULT '{}',
  seo_title_pattern TEXT,
  seo_description_pattern TEXT,
  schema_type TEXT DEFAULT 'WebPage',
  downloads INTEGER NOT NULL DEFAULT 0,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared templates"
  ON public.shared_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own shared templates"
  ON public.shared_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shared templates"
  ON public.shared_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own shared templates"
  ON public.shared_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Template ratings
CREATE TABLE public.template_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shared_template_id UUID REFERENCES public.shared_templates(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (shared_template_id, user_id)
);

ALTER TABLE public.template_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view template ratings"
  ON public.template_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own ratings"
  ON public.template_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON public.template_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON public.template_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
