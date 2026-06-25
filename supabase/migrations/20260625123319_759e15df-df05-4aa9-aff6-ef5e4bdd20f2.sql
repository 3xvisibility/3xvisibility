CREATE TABLE public.elementor_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_template_id text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  preview_image text,
  elementor_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  template_structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  editable_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_template_id)
);

GRANT SELECT ON public.elementor_templates TO anon, authenticated;
GRANT ALL ON public.elementor_templates TO service_role;

ALTER TABLE public.elementor_templates ENABLE ROW LEVEL SECURITY;

-- Marketplace Elementor templates are global catalog data: readable by everyone,
-- writable only by the service role (the seeding edge function).
CREATE POLICY "Elementor templates are readable by everyone"
  ON public.elementor_templates FOR SELECT
  USING (true);

CREATE TRIGGER update_elementor_templates_updated_at
  BEFORE UPDATE ON public.elementor_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();