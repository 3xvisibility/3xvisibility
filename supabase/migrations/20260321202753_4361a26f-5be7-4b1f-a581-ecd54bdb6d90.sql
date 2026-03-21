
-- Create workspace_invitations table for pending email invitations
CREATE TABLE public.workspace_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (workspace_id, email)
);

-- Enable RLS
ALTER TABLE public.workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Admins/owners can manage invitations for their workspace
CREATE POLICY "Members can view workspace invitations"
  ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Admins can insert workspace invitations"
  ON public.workspace_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY "Admins can update workspace invitations"
  ON public.workspace_invitations
  FOR UPDATE
  TO authenticated
  USING (
    get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin')
  );

CREATE POLICY "Admins can delete workspace invitations"
  ON public.workspace_invitations
  FOR DELETE
  TO authenticated
  USING (
    get_workspace_role(auth.uid(), workspace_id) IN ('owner', 'admin')
  );

-- Users can view their own invitations (by email match - handled in edge function)
-- We also allow users to see invitations addressed to them
CREATE POLICY "Users can view own invitations by invited_by"
  ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());
