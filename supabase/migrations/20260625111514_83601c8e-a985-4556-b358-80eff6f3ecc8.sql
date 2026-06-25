-- 1. Remove anon's table-level read access to sensitive tables (workspace-scoped, authenticated-only)
REVOKE SELECT ON public.shopify_connections FROM anon;
REVOKE SELECT ON public.subscriptions FROM anon;
REVOKE SELECT ON public.webhook_endpoints FROM anon;
REVOKE SELECT ON public.websites FROM anon;

-- 2. Tighten render-checks storage policies to enforce workspace ownership via path
--    Object path convention: <workspace_id>/<...>. service_role uploads bypass RLS.
DROP POLICY IF EXISTS "Authenticated read render-checks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated write render-checks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update render-checks" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete render-checks" ON storage.objects;

CREATE POLICY "Workspace members read render-checks"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'render-checks'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace members write render-checks"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'render-checks'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace members update render-checks"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'render-checks'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'render-checks'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Workspace members delete render-checks"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'render-checks'
  AND public.is_workspace_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);