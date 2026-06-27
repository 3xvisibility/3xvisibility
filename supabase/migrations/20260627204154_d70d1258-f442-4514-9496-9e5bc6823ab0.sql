ALTER TABLE public.elementor_templates
  ADD COLUMN IF NOT EXISTS shopify_section_json jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.elementor_templates.shopify_section_json IS
  'Shopify Online Store 2.0 section template kit: { template: {sections,order}, section_liquid, placeholders, image_map }. Master source for native Shopify section publishing.';