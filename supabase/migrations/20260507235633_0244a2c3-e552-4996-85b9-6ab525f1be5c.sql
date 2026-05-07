
-- Recreate the view with SECURITY INVOKER (default, explicit for clarity)
DROP VIEW IF EXISTS public.shopify_connections_safe;
CREATE VIEW public.shopify_connections_safe
WITH (security_invoker = true) AS
  SELECT id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at
  FROM public.shopify_connections;

GRANT SELECT ON public.shopify_connections_safe TO authenticated;
