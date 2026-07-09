DROP POLICY IF EXISTS "Anyone can view shared templates" ON public.shared_templates;

CREATE POLICY "View approved or own shared templates"
  ON public.shared_templates FOR SELECT
  TO authenticated
  USING (is_approved = true OR auth.uid() = user_id);