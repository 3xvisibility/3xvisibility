REVOKE SELECT (access_token) ON public.shopify_connections FROM authenticated, anon;
REVOKE SELECT (stripe_customer_id, stripe_subscription_id) ON public.subscriptions FROM authenticated, anon;
REVOKE SELECT (ip_address, user_agent) ON public.affiliate_clicks FROM authenticated, anon;