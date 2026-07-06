
-- Sync/backfill run header
CREATE TABLE public.template_backfill_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status text NOT NULL DEFAULT 'running',        -- running | completed | failed
  trigger_source text NOT NULL DEFAULT 'manual', -- manual | scheduled | auto
  force boolean NOT NULL DEFAULT false,
  total_templates integer NOT NULL DEFAULT 0,
  processed integer NOT NULL DEFAULT 0,
  converted integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  error text,
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_backfill_runs TO authenticated;
GRANT ALL ON public.template_backfill_runs TO service_role;

ALTER TABLE public.template_backfill_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backfill runs"
  ON public.template_backfill_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage backfill runs"
  ON public.template_backfill_runs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Per-template result
CREATE TABLE public.template_backfill_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.template_backfill_runs(id) ON DELETE CASCADE,
  template_id uuid,
  template_name text,
  status text NOT NULL DEFAULT 'pending',  -- success | failed | skipped
  attempts integer NOT NULL DEFAULT 0,
  widgets integer,
  fields integer,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_backfill_items_run ON public.template_backfill_items(run_id);
CREATE INDEX idx_backfill_items_status ON public.template_backfill_items(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_backfill_items TO authenticated;
GRANT ALL ON public.template_backfill_items TO service_role;

ALTER TABLE public.template_backfill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view backfill items"
  ON public.template_backfill_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage backfill items"
  ON public.template_backfill_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_backfill_runs_updated_at
  BEFORE UPDATE ON public.template_backfill_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backfill_items_updated_at
  BEFORE UPDATE ON public.template_backfill_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
