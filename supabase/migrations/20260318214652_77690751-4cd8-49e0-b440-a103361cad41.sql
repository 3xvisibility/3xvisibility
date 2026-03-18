
-- Location database table for built-in cities/counties/zip codes
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  county text,
  state text NOT NULL,
  state_code text,
  zip_code text,
  country text NOT NULL DEFAULT 'US',
  country_code text NOT NULL DEFAULT 'US',
  latitude numeric(10,6),
  longitude numeric(10,6),
  population integer,
  timezone text,
  region text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for fast filtering
CREATE INDEX idx_locations_state ON public.locations(state);
CREATE INDEX idx_locations_state_code ON public.locations(state_code);
CREATE INDEX idx_locations_country ON public.locations(country_code);
CREATE INDEX idx_locations_zip ON public.locations(zip_code);
CREATE INDEX idx_locations_city ON public.locations(city);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Everyone can read locations (it's reference data)
CREATE POLICY "Anyone can read locations" ON public.locations
  FOR SELECT TO authenticated USING (true);

-- Only service role can insert/update/delete (seeding)
