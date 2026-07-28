CREATE OR REPLACE FUNCTION public.log_security_event(
  _workspace_id uuid,
  _action text,
  _entity_type text DEFAULT 'security',
  _entity_id uuid DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF _workspace_id IS NULL OR _action IS NULL OR v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = _workspace_id) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.audit_logs (workspace_id, user_id, action, entity_type, entity_id, details)
  VALUES (
    _workspace_id,
    v_uid,
    _action,
    COALESCE(_entity_type, 'security'),
    _entity_id,
    COALESCE(_details, '{}'::jsonb) || jsonb_build_object('security', true)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_security_event(uuid, text, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(uuid, text, text, uuid, jsonb) TO service_role;