CREATE TABLE public.plan_pricing (
  plan text PRIMARY KEY,
  label text NOT NULL,
  monthly_price numeric NOT NULL DEFAULT 0,
  yearly_discount numeric NOT NULL DEFAULT 0.1667,
  currency text NOT NULL DEFAULT 'EUR',
  pages_limit integer NOT NULL DEFAULT 0,
  ai_limit integer NOT NULL DEFAULT 0,
  base_credits integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  stripe_product_id text,
  popular boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.plan_pricing TO anon;
GRANT SELECT ON public.plan_pricing TO authenticated;
GRANT ALL ON public.plan_pricing TO service_role;

ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan pricing"
  ON public.plan_pricing FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage plan pricing"
  ON public.plan_pricing FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_plan_pricing_updated_at
  BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.plan_pricing (plan, label, monthly_price, pages_limit, ai_limit, base_credits, stripe_price_id, stripe_product_id, popular, sort_order) VALUES
  ('free', 'Free', 0, 10, 10, 10, NULL, NULL, false, 1),
  ('starter', 'Starter', 19, 300, 100, 100, 'price_1TC0wb2eZvKYlo2CIxVw0sMl', 'prod_UALduTYX0c1iq6', false, 2),
  ('pro', 'Pro', 59, 3000, 1000, 300, 'price_1TC2Bg2eZvKYlo2CUbk9bLNI', 'prod_UAMvLB3qPitarV', true, 3),
  ('agency', 'Agency', 149, 15000, 5000, 500, 'price_1TC2Ew2eZvKYlo2CL9fDO7kX', 'prod_UAMyFLJgpAa7L7', false, 4);