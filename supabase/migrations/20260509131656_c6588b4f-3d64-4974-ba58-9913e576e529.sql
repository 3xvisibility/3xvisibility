
CREATE TABLE public.ai_credit_gate_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  prompt_type text,
  model text,
  status text NOT NULL,
  reason text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_credit_gate_logs_created_at ON public.ai_credit_gate_logs (created_at DESC);
CREATE INDEX idx_ai_credit_gate_logs_status ON public.ai_credit_gate_logs (status);

ALTER TABLE public.ai_credit_gate_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "Admins can view all credit gate logs"
ON public.ai_credit_gate_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Inserts come from edge functions via service role; no insert policy needed for users.
