
CREATE TABLE public.store_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  website_id UUID REFERENCES public.websites(id) ON DELETE SET NULL,
  niche TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  product_count INTEGER NOT NULL DEFAULT 10,
  price_min NUMERIC(10,2) DEFAULT 9.99,
  price_max NUMERIC(10,2) DEFAULT 99.99,
  content_tone TEXT DEFAULT 'professional',
  language TEXT DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending',
  categories JSONB DEFAULT '[]',
  products JSONB DEFAULT '[]',
  progress JSONB DEFAULT '{"categories_created": 0, "products_created": 0, "pages_created": 0, "total_categories": 0, "total_products": 0}',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own store generations"
  ON public.store_generations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own store generations"
  ON public.store_generations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own store generations"
  ON public.store_generations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own store generations"
  ON public.store_generations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.store_generations;
