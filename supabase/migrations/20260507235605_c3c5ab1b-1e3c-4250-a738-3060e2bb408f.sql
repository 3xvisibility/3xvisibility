
-- 1. Create a security-definer function that only service_role can use to read tokens
-- This is used by edge functions server-side only.
CREATE OR REPLACE FUNCTION public.get_shopify_access_token(_website_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT access_token FROM public.shopify_connections
  WHERE website_id = _website_id
  LIMIT 1
$$;

-- Revoke execute from public roles so only service_role can call it
REVOKE EXECUTE ON FUNCTION public.get_shopify_access_token(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_shopify_access_token(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_shopify_access_token(uuid) FROM authenticated;

-- 2. Create a view that excludes access_token for client-side queries
CREATE OR REPLACE VIEW public.shopify_connections_safe AS
  SELECT id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at
  FROM public.shopify_connections;

-- Grant select on the safe view to authenticated users
GRANT SELECT ON public.shopify_connections_safe TO authenticated;
