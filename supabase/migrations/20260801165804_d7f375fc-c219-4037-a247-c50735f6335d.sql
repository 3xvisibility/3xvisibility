-- Lock secret columns away from client roles, keep column-level access to the rest.
REVOKE SELECT ON public.shopify_connections FROM authenticated, anon;
GRANT SELECT (id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at)
  ON public.shopify_connections TO authenticated;
REVOKE UPDATE ON public.shopify_connections FROM authenticated, anon;
GRANT UPDATE (shop_domain, website_id, scopes, updated_at) ON public.shopify_connections TO authenticated;
GRANT ALL ON public.shopify_connections TO service_role;

REVOKE SELECT ON public.webhook_endpoints FROM authenticated, anon;
GRANT SELECT (id, user_id, workspace_id, url, events, is_active, last_triggered_at, last_status_code, created_at, updated_at)
  ON public.webhook_endpoints TO authenticated;
REVOKE UPDATE ON public.webhook_endpoints FROM authenticated, anon;
GRANT UPDATE (url, events, is_active, updated_at) ON public.webhook_endpoints TO authenticated;
GRANT ALL ON public.webhook_endpoints TO service_role;