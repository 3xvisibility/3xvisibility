ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS shopify_page_template_suffix text,
  ADD COLUMN IF NOT EXISTS shopify_product_template_suffix text;