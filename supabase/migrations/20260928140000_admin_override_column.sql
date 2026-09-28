-- Permanently protect admin-granted plans from being reset to "free" by the
-- check-subscription Stripe sync. Without this column + flag, any user whose
-- plan was set manually from the admin dashboard gets clobbered back to free
-- the next time check-subscription runs (on login / page load), because Stripe
-- has no matching subscription for them.

ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS admin_override BOOLEAN DEFAULT false;

-- Mark every existing non-free row as admin-managed so current Agency/Pro grants
-- survive the next sync immediately (before you re-grant anything).
UPDATE public.subscriptions SET admin_override = true WHERE plan <> 'free' AND admin_override IS NULL;

NOTIFY pgrst, 'reload schema';
