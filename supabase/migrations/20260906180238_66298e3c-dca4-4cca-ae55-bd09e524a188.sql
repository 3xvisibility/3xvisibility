CREATE TABLE public.translation_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  language text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (language, key)
);

GRANT SELECT ON public.translation_overrides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.translation_overrides TO authenticated;
GRANT ALL ON public.translation_overrides TO service_role;

ALTER TABLE public.translation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translation overrides"
  ON public.translation_overrides FOR SELECT USING (true);

CREATE POLICY "Admins can manage translation overrides"
  ON public.translation_overrides FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_translation_overrides_updated_at
  BEFORE UPDATE ON public.translation_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();