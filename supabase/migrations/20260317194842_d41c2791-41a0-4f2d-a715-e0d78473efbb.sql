
-- Add campaign_type enum
CREATE TYPE public.campaign_type AS ENUM ('seo', 'sea', 'geo');

-- Add campaign_type and options columns to campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS campaign_type public.campaign_type NOT NULL DEFAULT 'seo',
  ADD COLUMN IF NOT EXISTS utm_settings jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS geo_settings jsonb DEFAULT NULL;

-- utm_settings example: { "utm_source": "google", "utm_medium": "cpc", "utm_campaign": "{campaign_name}", "utm_term": "{keyword}", "utm_content": "" }
-- geo_settings example: { "country": "", "region": "", "city": "", "postcode": "", "lat": null, "lng": null, "language": "en" }

COMMENT ON COLUMN public.campaigns.campaign_type IS 'Type of campaign: seo, sea, or geo';
COMMENT ON COLUMN public.campaigns.utm_settings IS 'UTM parameters for SEA campaigns';
COMMENT ON COLUMN public.campaigns.geo_settings IS 'Geographic targeting settings for GEO campaigns';
