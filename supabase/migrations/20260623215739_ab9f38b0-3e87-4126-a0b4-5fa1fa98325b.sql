-- Fix affiliate_clicks: hide visitor IP addresses from link owners via column-level grants
REVOKE SELECT ON public.affiliate_clicks FROM anon;
REVOKE SELECT ON public.affiliate_clicks FROM authenticated;
GRANT SELECT (id, affiliate_link_id, referrer, user_agent, created_at) ON public.affiliate_clicks TO authenticated;

-- Fix contact_submissions: ensure anonymous users cannot read submissions (only admins, enforced by RLS)
REVOKE SELECT ON public.contact_submissions FROM anon;