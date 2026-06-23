-- Restrict sensitive columns to service_role only via column-level GRANTs.
-- RLS policies remain unchanged; column-level grants prevent authenticated
-- users from reading sensitive columns even though the row is visible.

-- shopify_connections: hide access_token
REVOKE SELECT ON public.shopify_connections FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, website_id, shop_domain, scopes, created_at, updated_at)
  ON public.shopify_connections TO authenticated;

-- subscriptions: hide stripe_customer_id, stripe_subscription_id
REVOKE SELECT ON public.subscriptions FROM authenticated;
GRANT SELECT (id, user_id, plan, pages_limit, pages_used, current_period_start, current_period_end, created_at, updated_at, ai_generations_used, ai_generations_limit, workspace_id, billing_cycle)
  ON public.subscriptions TO authenticated;

-- webhook_endpoints: hide secret
REVOKE SELECT ON public.webhook_endpoints FROM authenticated;
GRANT SELECT (id, user_id, workspace_id, url, events, is_active, last_triggered_at, last_status_code, created_at, updated_at)
  ON public.webhook_endpoints TO authenticated;

-- websites: hide credentials
REVOKE SELECT ON public.websites FROM authenticated;
GRANT SELECT (id, user_id, name, url, type, status, last_sync, created_at, updated_at, google_indexing_enabled, google_service_account, workspace_id, language, language_locked, shop_details)
  ON public.websites TO authenticated;

-- suppressed_emails: explicit restrictive deny for authenticated (consistency with email_send_log)
DROP POLICY IF EXISTS "Authenticated cannot read suppressed_emails" ON public.suppressed_emails;
CREATE POLICY "Authenticated cannot read suppressed_emails"
  ON public.suppressed_emails
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (false);
