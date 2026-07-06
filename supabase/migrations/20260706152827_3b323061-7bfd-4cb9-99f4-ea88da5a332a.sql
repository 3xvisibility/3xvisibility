ALTER TABLE public.template_backfill_runs
  ADD COLUMN IF NOT EXISTS retry_of_run_id uuid REFERENCES public.template_backfill_runs(id) ON DELETE SET NULL;

CREATE TABLE public.template_backfill_page_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.template_backfill_runs(id) ON DELETE CASCADE,
  template_id uuid,
  template_name text,
  page_id uuid,
  page_title text,
  page_slug text,
  page_status text,
  status text NOT NULL DEFAULT 'affected',  -- affected | updated | skipped
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_backfill_page_items_run ON public.template_backfill_page_items(run_id);
CREATE INDEX idx_backfill_page_items_template ON public.template_backfill_page_items(template_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_backfill_page_items TO authenticated;
GRANT ALL ON public.template_backfill_page_items TO service_role;

ALTER TABLE public.template_backfill_page_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backfill page items"
  ON public.template_backfill_page_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage backfill page items"
  ON public.template_backfill_page_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_backfill_page_items_updated_at
  BEFORE UPDATE ON public.template_backfill_page_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();