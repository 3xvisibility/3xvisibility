
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.campaign_csv_files'::regclass AND polcmd = 'a' LOOP
    EXECUTE format('DROP POLICY %I ON public.campaign_csv_files', pol.polname);
  END LOOP;
  FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = 'public.page_versions'::regclass AND polcmd = 'a' LOOP
    EXECUTE format('DROP POLICY %I ON public.page_versions', pol.polname);
  END LOOP;
END $$;

CREATE POLICY "Users insert csv in own workspaces"
ON public.campaign_csv_files
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.is_workspace_member(auth.uid(), workspace_id)
);

CREATE POLICY "Users insert page versions in own workspaces"
ON public.page_versions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (workspace_id IS NULL OR public.is_workspace_member(auth.uid(), workspace_id))
);
