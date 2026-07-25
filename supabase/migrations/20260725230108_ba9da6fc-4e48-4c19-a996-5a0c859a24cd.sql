ALTER TABLE public.websites
  ADD COLUMN IF NOT EXISTS wp_plugin_settings jsonb NOT NULL DEFAULT '{"allowed_tags":["style","link","script","svg"],"disable_wpautop":true}'::jsonb;