CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT pgmq.create('email_queue') WHERE NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'email_queue');
SELECT pgmq.create('email_dlq')   WHERE NOT EXISTS (SELECT 1 FROM pgmq.list_queues() WHERE queue_name = 'email_dlq');

CREATE TABLE IF NOT EXISTS public.app_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id uuid NOT NULL,
  config_key text NOT NULL,
  config_value text NOT NULL DEFAULT '',
  is_secret boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_config_ws_key_uidx ON public.app_config (workspace_id, config_key);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_config TO authenticated;
GRANT ALL ON public.app_config TO service_role;

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace admins manage their config" ON public.app_config;
CREATE POLICY "Workspace admins manage their config"
ON public.app_config FOR ALL TO authenticated
USING (
  public.get_workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.get_workspace_role(auth.uid(), workspace_id) IN ('owner','admin')
  OR public.has_role(auth.uid(), 'admin')
);

DROP TRIGGER IF EXISTS update_app_config_updated_at ON public.app_config;
CREATE TRIGGER update_app_config_updated_at
BEFORE UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS enforce_workspace_id_app_config ON public.app_config;
CREATE TRIGGER enforce_workspace_id_app_config
BEFORE INSERT OR UPDATE ON public.app_config
FOR EACH ROW EXECUTE FUNCTION public.validate_workspace_id();
