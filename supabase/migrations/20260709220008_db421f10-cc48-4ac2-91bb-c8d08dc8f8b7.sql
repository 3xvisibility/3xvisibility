CREATE POLICY "Admins can view all shared templates"
  ON public.shared_templates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update any shared template"
  ON public.shared_templates FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any shared template"
  ON public.shared_templates FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));