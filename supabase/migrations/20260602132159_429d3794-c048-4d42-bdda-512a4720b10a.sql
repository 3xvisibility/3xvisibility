CREATE TABLE public.user_ai_access (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  provider text NOT NULL DEFAULT 'lovable',
  enabled boolean NOT NULL DEFAULT true,
  purposes text[] NOT NULL DEFAULT '{}'::text[],
  monthly_credit_limit integer,
  notes text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_access TO authenticated;
GRANT ALL ON public.user_ai_access TO service_role;

ALTER TABLE public.user_ai_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all AI access"
ON public.user_ai_access
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own AI access"
ON public.user_ai_access
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_ai_access_updated_at
BEFORE UPDATE ON public.user_ai_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();