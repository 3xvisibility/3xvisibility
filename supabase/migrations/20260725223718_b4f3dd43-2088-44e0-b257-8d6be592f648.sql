ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS inline_assets_fallback boolean NOT NULL DEFAULT false;