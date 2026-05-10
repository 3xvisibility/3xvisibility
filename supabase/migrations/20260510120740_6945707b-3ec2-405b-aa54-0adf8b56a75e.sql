CREATE TABLE IF NOT EXISTS public.system_settings (
  id text PRIMARY KEY DEFAULT 'global',
  ai_provider text NOT NULL DEFAULT 'lovable',
  feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb,
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update system settings"
  ON public.system_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert system settings"
  ON public.system_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.system_settings (id) VALUES ('global') ON CONFLICT (id) DO NOTHING;