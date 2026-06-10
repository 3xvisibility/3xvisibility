-- 1. Fix mutable search_path on email queue functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

-- 2. Prevent audit log tampering: remove direct member INSERT.
DROP POLICY IF EXISTS "Members can insert audit logs" ON public.audit_logs;

-- 3. Stop broadcasting affiliate_referrals row changes to all Realtime subscribers
ALTER PUBLICATION supabase_realtime DROP TABLE public.affiliate_referrals;
