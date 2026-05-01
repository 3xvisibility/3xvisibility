
CREATE TABLE public.shopify_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL,
  shop_domain text NOT NULL,
  client_id text NOT NULL,
  client_secret text NOT NULL,
  site_name text,
  language text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shopify_oauth_states ENABLE ROW LEVEL SECURITY;

-- Only the service role (edge functions) will interact with this table
-- Users don't need direct access
CREATE POLICY "Service role only - users cannot read oauth states"
  ON public.shopify_oauth_states
  FOR ALL
  TO authenticated
  USING (false);
