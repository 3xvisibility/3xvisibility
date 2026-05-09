
-- ── ai_credits: per-user balance ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'starter',
  total_credits integer NOT NULL DEFAULT 100,
  used_credits integer NOT NULL DEFAULT 0,
  remaining_credits integer NOT NULL DEFAULT 100,
  credits_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own credits" ON public.ai_credits;
CREATE POLICY "Users can view own credits"
ON public.ai_credits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ── ai_credits_usage: per-request log ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_credits_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prompt_type text NOT NULL DEFAULT 'default',
  credits_used integer NOT NULL DEFAULT 1,
  model text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_credits_usage_user_created
  ON public.ai_credits_usage (user_id, created_at DESC);

ALTER TABLE public.ai_credits_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON public.ai_credits_usage;
CREATE POLICY "Users can view own usage"
ON public.ai_credits_usage FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ── deduct_ai_credits RPC ────────────────────────────────────────────────────
-- Atomically: ensures row exists, auto-resets when past reset date,
-- checks balance, deducts, logs usage. Returns { success, remaining, reason? }.
CREATE OR REPLACE FUNCTION public.deduct_ai_credits(
  p_user_id uuid,
  p_credits integer,
  p_prompt_type text,
  p_model text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.ai_credits%ROWTYPE;
  v_cost integer := GREATEST(COALESCE(p_credits, 1), 1);
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'remaining', 0, 'reason', 'missing_user');
  END IF;

  -- Ensure a row exists
  INSERT INTO public.ai_credits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Lock the row for update
  SELECT * INTO v_row FROM public.ai_credits WHERE user_id = p_user_id FOR UPDATE;

  -- Monthly auto-reset
  IF v_row.credits_reset_at <= now() THEN
    UPDATE public.ai_credits
       SET used_credits = 0,
           remaining_credits = total_credits,
           credits_reset_at = date_trunc('month', now()) + interval '1 month',
           updated_at = now()
     WHERE user_id = p_user_id
     RETURNING * INTO v_row;
  END IF;

  -- Insufficient balance
  IF v_row.remaining_credits < v_cost THEN
    RETURN jsonb_build_object(
      'success', false,
      'remaining', v_row.remaining_credits,
      'reason', 'insufficient_credits'
    );
  END IF;

  -- Deduct
  UPDATE public.ai_credits
     SET used_credits = used_credits + v_cost,
         remaining_credits = remaining_credits - v_cost,
         updated_at = now()
   WHERE user_id = p_user_id
   RETURNING * INTO v_row;

  -- Log usage (best-effort)
  INSERT INTO public.ai_credits_usage (user_id, prompt_type, credits_used, model, metadata)
  VALUES (p_user_id, COALESCE(p_prompt_type, 'default'), v_cost, p_model, COALESCE(p_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'remaining', v_row.remaining_credits);
END;
$$;

-- Restrict execution: only service role / authenticated callers (the RPC
-- enforces its own logic and is SECURITY DEFINER so it bypasses RLS).
REVOKE ALL ON FUNCTION public.deduct_ai_credits(uuid, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_ai_credits(uuid, integer, text, text, jsonb) TO authenticated, service_role;

-- updated_at trigger reuse
DROP TRIGGER IF EXISTS trg_ai_credits_updated_at ON public.ai_credits;
CREATE TRIGGER trg_ai_credits_updated_at
BEFORE UPDATE ON public.ai_credits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
