ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS container_width_tablet integer,
  ADD COLUMN IF NOT EXISTS container_width_mobile integer,
  ADD COLUMN IF NOT EXISTS gutter_desktop integer,
  ADD COLUMN IF NOT EXISTS gutter_tablet integer,
  ADD COLUMN IF NOT EXISTS gutter_mobile integer;

ALTER TABLE public.generated_pages
  ADD COLUMN IF NOT EXISTS container_width_tablet integer,
  ADD COLUMN IF NOT EXISTS container_width_mobile integer,
  ADD COLUMN IF NOT EXISTS gutter_desktop integer,
  ADD COLUMN IF NOT EXISTS gutter_tablet integer,
  ADD COLUMN IF NOT EXISTS gutter_mobile integer;