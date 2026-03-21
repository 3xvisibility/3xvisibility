
-- Add tenant settings columns to workspaces
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS seo_defaults JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Add notification preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB NOT NULL DEFAULT '{"job_completed": true, "job_failed": true, "usage_limit": true}'::jsonb;
