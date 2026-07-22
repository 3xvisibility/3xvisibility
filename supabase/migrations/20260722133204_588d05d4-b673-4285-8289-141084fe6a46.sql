DROP POLICY IF EXISTS "Members can update workspace ab_tests" ON public.ab_tests;
CREATE POLICY "Members can update workspace ab_tests" ON public.ab_tests
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

DROP POLICY IF EXISTS "Members can update workspace page_metrics" ON public.page_metrics;
CREATE POLICY "Members can update workspace page_metrics" ON public.page_metrics
  FOR UPDATE USING (is_workspace_member(auth.uid(), workspace_id))
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));