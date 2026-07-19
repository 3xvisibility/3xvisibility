
DROP POLICY IF EXISTS "Admins can update workspace members" ON public.workspace_members;

CREATE POLICY "Admins can update workspace members"
ON public.workspace_members
FOR UPDATE
USING (
  public.get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
)
WITH CHECK (
  -- Row must remain in the same workspace the admin governs
  public.get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role])
  -- Only owners can assign or retain the 'owner' role; admins cannot escalate to owner
  AND (
    role <> 'owner'::workspace_role
    OR public.get_workspace_role(auth.uid(), workspace_id) = 'owner'::workspace_role
  )
);
