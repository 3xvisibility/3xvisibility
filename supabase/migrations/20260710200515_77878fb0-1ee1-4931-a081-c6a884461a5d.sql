
-- Shopify connections: hide access_token
REVOKE SELECT ON public.shopify_connections FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at) ON public.shopify_connections TO authenticated;

-- Subscriptions: hide stripe ids
REVOKE SELECT ON public.subscriptions FROM authenticated;
GRANT SELECT (id, user_id, plan, pages_limit, pages_used, current_period_start, current_period_end, created_at, updated_at, ai_generations_used, ai_generations_limit, workspace_id, billing_cycle) ON public.subscriptions TO authenticated;

-- Webhook endpoints: hide secret
REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, url, events, is_active, last_triggered_at, last_status_code, created_at, updated_at) ON public.webhook_endpoints TO authenticated;

-- Websites: hide credentials and google_service_account
REVOKE SELECT ON public.websites FROM authenticated;
GRANT SELECT (id, user_id, name, url, type, status, last_sync, created_at, updated_at, google_indexing_enabled, workspace_id, language, language_locked, shop_details, site_context) ON public.websites TO authenticated;
