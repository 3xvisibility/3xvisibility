ALTER TABLE public.template_backfill_page_items
  ADD COLUMN IF NOT EXISTS has_icon_widgets boolean NOT NULL DEFAULT false;