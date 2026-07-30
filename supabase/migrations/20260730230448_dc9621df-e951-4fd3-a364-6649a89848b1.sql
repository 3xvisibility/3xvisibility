-- 1) Verified-email helper: read the confirmed email from auth.users instead of trusting the JWT claim
CREATE OR REPLACE FUNCTION public.current_verified_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_verified_email() FROM public;
GRANT EXECUTE ON FUNCTION public.current_verified_email() TO authenticated;

DROP POLICY IF EXISTS "Invitees can view their own invitations" ON public.workspace_invitations;
CREATE POLICY "Invitees can view their own invitations"
ON public.workspace_invitations
FOR SELECT
TO authenticated
USING (
  public.current_verified_email() IS NOT NULL
  AND lower(email) = public.current_verified_email()
);

DROP POLICY IF EXISTS "Invitees can decline their own invitations" ON public.workspace_invitations;
CREATE POLICY "Invitees can decline their own invitations"
ON public.workspace_invitations
FOR DELETE
TO authenticated
USING (
  public.current_verified_email() IS NOT NULL
  AND lower(email) = public.current_verified_email()
);

-- 2) Contact form: validate payload size/shape so the public insert path cannot be used to dump arbitrary blobs
ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_name_len
    CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 200) NOT VALID;

ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_email_valid
    CHECK (email IS NULL OR (char_length(email) <= 320 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')) NOT VALID;

ALTER TABLE public.contact_submissions
  ADD CONSTRAINT contact_submissions_message_len
    CHECK (message IS NULL OR char_length(message) BETWEEN 1 AND 5000) NOT VALID;
