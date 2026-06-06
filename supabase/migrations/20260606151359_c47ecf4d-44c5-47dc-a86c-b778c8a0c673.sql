ALTER TABLE public.affiliate_referrals ADD COLUMN IF NOT EXISTS credit_reward integer NOT NULL DEFAULT 0;

CREATE TABLE public.referral_reward_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan text NOT NULL UNIQUE,
  reward_credits integer NOT NULL DEFAULT 50,
  monthly_limit integer,
  min_threshold integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.referral_reward_settings TO authenticated;
GRANT ALL ON public.referral_reward_settings TO service_role;

ALTER TABLE public.referral_reward_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view reward settings"
  ON public.referral_reward_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert reward settings"
  ON public.referral_reward_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update reward settings"
  ON public.referral_reward_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reward settings"
  ON public.referral_reward_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_referral_reward_settings_updated_at
  BEFORE UPDATE ON public.referral_reward_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.referral_reward_settings (plan, reward_credits, monthly_limit, min_threshold, is_active)
VALUES
  ('default', 50, NULL, 0, true),
  ('starter', 50, NULL, 0, true),
  ('agency', 100, NULL, 0, true)
ON CONFLICT (plan) DO NOTHING;