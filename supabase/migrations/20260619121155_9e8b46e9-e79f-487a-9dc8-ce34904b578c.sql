-- 1. Restrict sensitive website columns to backend only (service_role).
REVOKE SELECT (google_service_account, credentials) ON public.websites FROM authenticated;
REVOKE SELECT (google_service_account, credentials) ON public.websites FROM anon;

-- 2. Remove the plaintext Shopify app secret from the DB; it lives in env vars only.
ALTER TABLE public.shopify_oauth_states DROP COLUMN IF EXISTS client_secret;

-- 3. Stop broadcasting the subscriptions table (incl. Stripe IDs) over Realtime.
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;