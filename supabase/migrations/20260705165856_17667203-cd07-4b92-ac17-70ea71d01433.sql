ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS elementor_container_width integer NOT NULL DEFAULT 0;