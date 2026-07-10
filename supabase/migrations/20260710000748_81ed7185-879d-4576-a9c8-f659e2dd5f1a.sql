CREATE POLICY "Members can insert workspace audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_workspace_member(auth.uid(), workspace_id)
);