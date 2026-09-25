-- Root cause of "every user shows as Free":
-- The only SELECT policy on public.subscriptions is scoped to
-- is_workspace_member(auth.uid(), workspace_id). Paid rows created before the
-- multi-workspace migration (or for a different workspace) carry a
-- workspace_id that the current member check rejects, so an Agency/Pro user's
-- own row is invisible to their client query -> the app falls back to "free".
--
-- Add an owner-scoped policy so a user can always read every subscription row
-- whose user_id is theirs, regardless of workspace_id. This is strictly additive:
-- it does not weaken any existing policy (members still see shared workspace rows).

DROP POLICY IF EXISTS "Users can view own subscriptions (any workspace)" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions (any workspace)"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Also let owners update their own rows (needed by check-subscription upserts
-- that run under the user session rather than service role in some paths).
DROP POLICY IF EXISTS "Users can update own subscriptions (any workspace)" ON public.subscriptions;
CREATE POLICY "Users can update own subscriptions (any workspace)"
  ON public.subscriptions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';