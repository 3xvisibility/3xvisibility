
-- Fix the permissive INSERT policy on affiliate_clicks
-- Replace WITH CHECK (true) with a check that the affiliate link exists
DROP POLICY "Anyone can insert clicks" ON public.affiliate_clicks;
CREATE POLICY "Authenticated or anon can insert clicks" ON public.affiliate_clicks FOR INSERT TO anon, authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.affiliate_links WHERE id = affiliate_link_id AND is_active = true)
);
