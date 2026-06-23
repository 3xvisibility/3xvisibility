ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS ai_max_lines integer,
  ADD COLUMN IF NOT EXISTS ai_max_words integer;