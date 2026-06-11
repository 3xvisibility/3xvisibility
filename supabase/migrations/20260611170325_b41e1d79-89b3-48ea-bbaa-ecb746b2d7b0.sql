-- 1. Restrict Shopify access tokens: remove column-level read access from clients
REVOKE SELECT (access_token) ON public.shopify_connections FROM authenticated;
REVOKE SELECT (access_token) ON public.shopify_connections FROM anon;

-- 2. Restrict sensitive website credential columns from client reads
REVOKE SELECT (credentials, google_service_account) ON public.websites FROM authenticated;
REVOKE SELECT (credentials, google_service_account) ON public.websites FROM anon;

-- 3. Affiliate payouts: ensure the referenced affiliate link belongs to the requester
DROP POLICY IF EXISTS "Users can request payouts" ON public.affiliate_payouts;
CREATE POLICY "Users can request payouts"
ON public.affiliate_payouts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.affiliate_links al
    WHERE al.id = affiliate_link_id
      AND al.user_id = auth.uid()
  )
);

-- 4. Lock down search_path on the remaining functions
ALTER FUNCTION public.template_limit_for_plan(text) SET search_path = public;
ALTER FUNCTION public.campaign_limit_for_plan(text) SET search_path = public;