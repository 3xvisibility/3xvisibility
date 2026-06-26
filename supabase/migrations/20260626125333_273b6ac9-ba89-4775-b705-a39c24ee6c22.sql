-- Helper: decide if the current user may access a Realtime channel topic.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ws text;
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
    -- Malformed / "none" workspace topic: deny.
    RETURN false;
  END IF;

  -- Other channels (user/website scoped) require an authenticated session.
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_realtime_topic(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_realtime_topic(text) TO authenticated, service_role;

-- Enable Realtime Authorization on realtime.messages.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive authorized realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can receive authorized realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.can_access_realtime_topic((SELECT realtime.topic())));

DROP POLICY IF EXISTS "Authenticated can send authorized realtime messages" ON realtime.messages;
CREATE POLICY "Authenticated can send authorized realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.can_access_realtime_topic((SELECT realtime.topic())));