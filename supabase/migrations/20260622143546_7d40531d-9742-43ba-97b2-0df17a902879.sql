CREATE TABLE public.marketplace_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'business',
  elementor_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables text[] NOT NULL DEFAULT '{}',
  default_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  preview_html text,
  source_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_templates TO authenticated;
GRANT ALL ON public.marketplace_templates TO service_role;

ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view marketplace templates"
  ON public.marketplace_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert marketplace templates"
  ON public.marketplace_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update marketplace templates"
  ON public.marketplace_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete marketplace templates"
  ON public.marketplace_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_marketplace_templates_updated_at
  BEFORE UPDATE ON public.marketplace_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();