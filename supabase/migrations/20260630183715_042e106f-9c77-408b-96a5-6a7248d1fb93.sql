
-- Restrict sensitive columns to service_role only via column-level privileges.

-- Shopify access tokens
REVOKE SELECT (access_token) ON public.shopify_connections FROM authenticated;
REVOKE SELECT (access_token) ON public.shopify_connections FROM anon;

-- Stripe identifiers
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.subscriptions FROM authenticated;
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.subscriptions FROM anon;

-- Webhook signing secrets
REVOKE SELECT (secret) ON public.webhook_endpoints FROM authenticated;
REVOKE SELECT (secret) ON public.webhook_endpoints FROM anon;

-- Website credentials and Google service account keys
REVOKE SELECT (credentials, google_service_account) ON public.websites FROM authenticated;
REVOKE SELECT (credentials, google_service_account) ON public.websites FROM anon;
