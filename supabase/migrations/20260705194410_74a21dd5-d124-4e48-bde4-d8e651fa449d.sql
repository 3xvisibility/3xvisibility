
-- affiliate_clicks
DROP POLICY IF EXISTS "Link owners can view clicks" ON public.affiliate_clicks;
CREATE POLICY "Link owners can view clicks" ON public.affiliate_clicks
FOR SELECT TO authenticated
USING (affiliate_link_id IN (SELECT affiliate_links.id FROM affiliate_links WHERE affiliate_links.user_id = auth.uid()));

-- affiliate_links
DROP POLICY IF EXISTS "Users can view own affiliate links" ON public.affiliate_links;
CREATE POLICY "Users can view own affiliate links" ON public.affiliate_links
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own affiliate links" ON public.affiliate_links;
CREATE POLICY "Users can insert own affiliate links" ON public.affiliate_links
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own affiliate links" ON public.affiliate_links;
CREATE POLICY "Users can update own affiliate links" ON public.affiliate_links
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- affiliate_payouts
DROP POLICY IF EXISTS "Users can view own payouts" ON public.affiliate_payouts;
CREATE POLICY "Users can view own payouts" ON public.affiliate_payouts
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- affiliate_referrals
DROP POLICY IF EXISTS "Users can view own referrals" ON public.affiliate_referrals;
CREATE POLICY "Users can view own referrals" ON public.affiliate_referrals
FOR SELECT TO authenticated
USING (affiliate_link_id IN (SELECT affiliate_links.id FROM affiliate_links WHERE affiliate_links.user_id = auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- marketplace / shared template read policies (scope to authenticated)
DROP POLICY IF EXISTS "Anyone can view marketplace templates" ON public.marketplace_templates;
CREATE POLICY "Anyone can view marketplace templates" ON public.marketplace_templates
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Elementor templates are readable by everyone" ON public.elementor_templates;
CREATE POLICY "Elementor templates are readable by everyone" ON public.elementor_templates
FOR SELECT TO authenticated USING (true);

-- user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);
