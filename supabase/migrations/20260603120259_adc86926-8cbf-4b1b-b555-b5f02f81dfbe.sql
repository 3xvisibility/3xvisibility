
-- 1. Hide sensitive columns from client roles (server/service_role still reads them)
REVOKE SELECT (access_token) ON public.shopify_connections FROM authenticated, anon;
REVOKE SELECT (secret) ON public.webhook_endpoints FROM authenticated, anon;
REVOKE SELECT (credentials, google_service_account) ON public.websites FROM authenticated, anon;
REVOKE SELECT (ip_address, user_agent) ON public.affiliate_clicks FROM authenticated, anon;

-- 2. Restrict workspace invitation visibility (emails) to owners/admins
DROP POLICY IF EXISTS "Members can view workspace invitations" ON public.workspace_invitations;
CREATE POLICY "Admins can view workspace invitations"
  ON public.workspace_invitations
  FOR SELECT
  TO authenticated
  USING (get_workspace_role(auth.uid(), workspace_id) = ANY (ARRAY['owner'::workspace_role, 'admin'::workspace_role]));

-- 3. Explicit admin-only write policies on user_roles (prevents privilege escalation)
CREATE POLICY "Admins can assign roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Storage: ownership-scoped write policies for the ai-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload AI images" ON storage.objects;

CREATE POLICY "Users upload AI images to own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users update own AI images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete own AI images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'ai-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 5. Remove public/authenticated EXECUTE on sensitive SECURITY DEFINER functions
--    (these are only invoked by server-side/service-role code or triggers)
REVOKE EXECUTE ON FUNCTION public.get_shopify_access_token(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.deduct_ai_credits(uuid, integer, text, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_workspace() FROM anon, authenticated, public;
