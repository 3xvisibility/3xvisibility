
-- Affiliate links table
CREATE TABLE public.affiliate_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  commission_rate NUMERIC NOT NULL DEFAULT 20,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  total_conversions INTEGER NOT NULL DEFAULT 0,
  total_earned NUMERIC NOT NULL DEFAULT 0,
  total_credited NUMERIC NOT NULL DEFAULT 0,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate referrals table
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  subscription_plan TEXT,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'credit',
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Affiliate clicks tracking
CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id UUID NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- RLS policies for affiliate_links
CREATE POLICY "Users can view own affiliate links" ON public.affiliate_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate links" ON public.affiliate_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own affiliate links" ON public.affiliate_links FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for affiliate_referrals
CREATE POLICY "Users can view own referrals" ON public.affiliate_referrals FOR SELECT USING (
  affiliate_link_id IN (SELECT id FROM public.affiliate_links WHERE user_id = auth.uid())
);

-- RLS policies for affiliate_payouts
CREATE POLICY "Users can view own payouts" ON public.affiliate_payouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can request payouts" ON public.affiliate_payouts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS policies for affiliate_clicks (public insert for tracking, owner select)
CREATE POLICY "Anyone can insert clicks" ON public.affiliate_clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Link owners can view clicks" ON public.affiliate_clicks FOR SELECT USING (
  affiliate_link_id IN (SELECT id FROM public.affiliate_links WHERE user_id = auth.uid())
);

-- Enable realtime for affiliate tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.affiliate_referrals;
