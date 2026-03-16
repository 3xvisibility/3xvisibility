
-- Add AI generation tracking to subscriptions
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS ai_generations_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_generations_limit integer NOT NULL DEFAULT 50;

-- Add AI settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'professional',
ADD COLUMN IF NOT EXISTS ai_content_length text NOT NULL DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS ai_language text NOT NULL DEFAULT 'en';
