DROP POLICY IF EXISTS "Members can update workspace keywords" ON public.pgp_keywords;
CREATE POLICY "Members can update workspace keywords"
ON public.pgp_keywords
FOR UPDATE
TO authenticated
USING (public.is_workspace_member(auth.uid(), workspace_id))
WITH CHECK (public.is_workspace_member(auth.uid(), workspace_id));