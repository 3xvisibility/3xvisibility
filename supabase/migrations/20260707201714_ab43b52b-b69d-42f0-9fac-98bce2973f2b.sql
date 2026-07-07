-- Per-template and per-page boxed content width override.
-- NULL = inherit from parent (template -> workspace). 0 = explicitly disabled
-- (content spans full width). >0 = box content at that pixel width while
-- section backgrounds stay full-width.
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS container_width integer;

ALTER TABLE public.generated_pages
  ADD COLUMN IF NOT EXISTS container_width integer;

COMMENT ON COLUMN public.templates.container_width IS 'Boxed content width in px. NULL inherits workspace default; 0 disables boxing; >0 boxes content while backgrounds stay full-width.';
COMMENT ON COLUMN public.generated_pages.container_width IS 'Boxed content width in px override for this page. NULL inherits template/workspace; 0 disables boxing; >0 boxes content.';