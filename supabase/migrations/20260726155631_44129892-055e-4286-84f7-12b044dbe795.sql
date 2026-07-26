ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS manual_status_reason text,
  ADD COLUMN IF NOT EXISTS manual_status_by uuid,
  ADD COLUMN IF NOT EXISTS manual_status_at timestamp with time zone;

GRANT SELECT, UPDATE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
CREATE POLICY "Admins can update invoices"
ON public.invoices
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));