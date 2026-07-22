
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_locations_city_trgm ON public.locations USING gin (city gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_state_trgm ON public.locations USING gin (state gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_region_trgm ON public.locations USING gin (region gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_zip_trgm ON public.locations USING gin (zip_code gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_locations_country_population ON public.locations (country_code, population DESC NULLS LAST);

CREATE OR REPLACE FUNCTION public.get_location_meta(_country_code text)
RETURNS TABLE(states text[], regions text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(array_agg(DISTINCT state ORDER BY state) FILTER (WHERE state IS NOT NULL AND state <> ''), ARRAY[]::text[]) AS states,
    COALESCE(array_agg(DISTINCT region ORDER BY region) FILTER (WHERE region IS NOT NULL AND region <> ''), ARRAY[]::text[]) AS regions
  FROM public.locations
  WHERE country_code = _country_code
$$;

GRANT EXECUTE ON FUNCTION public.get_location_meta(text) TO authenticated, anon, service_role;
