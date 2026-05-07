
-- Create table for per-user per-shop Shopify access tokens
CREATE TABLE public.shopify_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  website_id UUID,
  shop_domain TEXT NOT NULL,
  access_token TEXT NOT NULL,
  scopes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_domain)
);

-- Enable RLS
ALTER TABLE public.shopify_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Members can view workspace shopify connections"
  ON public.shopify_connections FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Users can insert own shopify connections"
  ON public.shopify_connections FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id) AND auth.uid() = user_id);

CREATE POLICY "Members can update workspace shopify connections"
  ON public.shopify_connections FOR UPDATE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace shopify connections"
  ON public.shopify_connections FOR DELETE TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id));

-- Auto-update timestamp
CREATE TRIGGER update_shopify_connections_updated_at
  BEFORE UPDATE ON public.shopify_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
