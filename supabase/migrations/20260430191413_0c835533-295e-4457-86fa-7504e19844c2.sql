-- Shopify product field mapping (store default + optional per-campaign override)
CREATE TABLE public.shopify_field_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL,
  website_id UUID NOT NULL,
  campaign_id UUID NULL,
  user_id UUID NOT NULL,
  -- Core product fields: each value is either a literal string or a template token like "{variable_name}"
  -- e.g. { "title": "{product_title}", "vendor": "Acme", "tags": "{tags}" }
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Per-variant fields applied to the default/first variant unless variant_rows is set in row data
  variant_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- List of { namespace, key, type, value } for Shopify metafields
  metafields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One default per website, one override per (website, campaign)
CREATE UNIQUE INDEX shopify_field_mappings_default_idx
  ON public.shopify_field_mappings (website_id)
  WHERE campaign_id IS NULL;
CREATE UNIQUE INDEX shopify_field_mappings_campaign_idx
  ON public.shopify_field_mappings (website_id, campaign_id)
  WHERE campaign_id IS NOT NULL;

CREATE INDEX shopify_field_mappings_workspace_idx
  ON public.shopify_field_mappings (workspace_id);

ALTER TABLE public.shopify_field_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace shopify mappings"
  ON public.shopify_field_mappings FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can insert workspace shopify mappings"
  ON public.shopify_field_mappings FOR INSERT
  TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace shopify mappings"
  ON public.shopify_field_mappings FOR UPDATE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace shopify mappings"
  ON public.shopify_field_mappings FOR DELETE
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE TRIGGER set_updated_at_shopify_field_mappings
  BEFORE UPDATE ON public.shopify_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_workspace_id_shopify_field_mappings
  BEFORE INSERT OR UPDATE ON public.shopify_field_mappings
  FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_id();