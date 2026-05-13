ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS site_lat numeric,
  ADD COLUMN IF NOT EXISTS site_lng numeric,
  ADD COLUMN IF NOT EXISTS site_radius_meters integer NOT NULL DEFAULT 200;

-- Haversine distance in meters
CREATE OR REPLACE FUNCTION public.geo_distance_meters(lat1 numeric, lng1 numeric, lat2 numeric, lng2 numeric)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r constant numeric := 6371000;
  dLat numeric; dLng numeric; a numeric; c numeric;
BEGIN
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN RETURN NULL; END IF;
  dLat := radians(lat2 - lat1);
  dLng := radians(lng2 - lng1);
  a := sin(dLat/2)^2 + cos(radians(lat1))*cos(radians(lat2))*sin(dLng/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  RETURN r * c;
END $$;