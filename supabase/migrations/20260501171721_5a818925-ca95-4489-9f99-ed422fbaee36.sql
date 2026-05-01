
CREATE TABLE public.shopify_sync_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  website_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  shopify_product_id BIGINT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'product/update',
  product_title TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  synced_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopify_sync_events_website ON public.shopify_sync_events (website_id, created_at DESC);
CREATE INDEX idx_shopify_sync_events_workspace ON public.shopify_sync_events (workspace_id);

ALTER TABLE public.shopify_sync_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace sync events"
ON public.shopify_sync_events FOR SELECT TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "Members can delete workspace sync events"
ON public.shopify_sync_events FOR DELETE TO authenticated
USING (is_workspace_member(auth.uid(), workspace_id));
