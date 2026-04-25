ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS vibe_theme jsonb;

COMMENT ON COLUMN public.templates.vibe_theme IS
  'Optional saved AI vibe defaults for this template (palette/typography/density + custom CSS overrides). Pre-filled into the campaign wizard when the template is selected.';