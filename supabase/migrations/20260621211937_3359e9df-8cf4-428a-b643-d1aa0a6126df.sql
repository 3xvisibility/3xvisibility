-- Restrict column-level SELECT on sensitive secret columns so only service_role can read them.

-- shopify_connections.access_token
REVOKE SELECT ON public.shopify_connections FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at) ON public.shopify_connections TO authenticated;

-- webhook_endpoints.secret
REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, url, events, is_active, last_triggered_at, last_status_code, created_at, updated_at) ON public.webhook_endpoints TO authenticated;

-- subscriptions stripe ids
REVOKE SELECT ON public.subscriptions FROM authenticated;
GRANT SELECT (id, user_id, plan, pages_limit, pages_used, current_period_start, current_period_end, created_at, updated_at, ai_generations_used, ai_generations_limit, workspace_id, billing_cycle) ON public.subscriptions TO authenticated;

-- email_send_log: add an explicit restrictive policy so recipient emails can never be exposed to authenticated users,
-- even if a future permissive policy is added.
CREATE POLICY "Deny non-service access to email send log"
ON public.email_send_log
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (false);