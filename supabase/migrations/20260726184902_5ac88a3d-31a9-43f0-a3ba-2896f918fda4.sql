-- 1) Affiliate clicks: only trusted server code may record clicks
DROP POLICY IF EXISTS "Authenticated or anon can insert clicks" ON public.affiliate_clicks;
REVOKE INSERT, UPDATE, DELETE ON public.affiliate_clicks FROM anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;

-- 2) Workspace invitations: invitees can see and decline their own invitation
CREATE POLICY "Invitees can view their own invitations"
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

CREATE POLICY "Invitees can decline their own invitations"
ON public.workspace_invitations
FOR DELETE
TO authenticated
USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));