-- Restrict google_service_account column (may hold private key material) to service_role only
REVOKE SELECT (google_service_account) ON public.websites FROM authenticated;

-- Tighten realtime topic authorization: deny arbitrary non-workspace channels.
-- Only allow workspace-scoped channels and the caller's own user-scoped channels.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ws text;
  uid text;
BEGIN
  -- Must be signed in.
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- Workspace-scoped channels: "ws:<workspace_id>:<base>"
  IF _topic LIKE 'ws:%' THEN
    ws := split_part(_topic, ':', 2);
    IF ws ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
      RETURN public.is_workspace_member(auth.uid(), ws::uuid);
    END IF;
    RETURN false;
  END IF;

  -- User-scoped channels: "user:<auth.uid()>:<base>" — only the owner may subscribe.
  IF _topic LIKE 'user:%' THEN
    uid := split_part(_topic, ':', 2);
    RETURN uid = auth.uid()::text;
  END IF;

  -- Everything else is denied.
  RETURN false;
END;
$function$;