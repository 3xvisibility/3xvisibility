
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}';

COMMENT ON COLUMN public.workspaces.branding IS 'Whitelabel branding config: {app_name, logo_url, primary_color, accent_color, favicon_url, hide_powered_by}';
