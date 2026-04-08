ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS population_male integer,
  ADD COLUMN IF NOT EXISTS population_female integer,
  ADD COLUMN IF NOT EXISTS median_age numeric,
  ADD COLUMN IF NOT EXISTS median_household_income numeric,
  ADD COLUMN IF NOT EXISTS ethnicity_data jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS wikipedia_url text,
  ADD COLUMN IF NOT EXISTS area_code text,
  ADD COLUMN IF NOT EXISTS phone_country_code text;