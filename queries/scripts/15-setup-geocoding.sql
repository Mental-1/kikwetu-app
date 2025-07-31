-- Enable PostGIS and Tiger Geocoder extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create geocoded_locations table for caching
CREATE TABLE IF NOT EXISTS geocoded_locations (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  formatted_address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  country TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  geometry GEOMETRY(POINT, 4326),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create spatial index for faster queries
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_geometry ON geocoded_locations USING GIST (geometry);
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_address ON geocoded_locations (address);
CREATE INDEX IF NOT EXISTS idx_geocoded_locations_city ON geocoded_locations (city);

-- Update listings table to use geometry
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS geometry GEOMETRY(POINT, 4326);

-- Create spatial index for listings
CREATE INDEX IF NOT EXISTS idx_listings_geometry ON listings USING GIST (geometry);

-- Function to update geometry from lat/lng
CREATE OR REPLACE FUNCTION update_listing_geometry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.geometry = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update geometry
DROP TRIGGER IF EXISTS update_listing_geometry_trigger ON listings;
CREATE TRIGGER update_listing_geometry_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION update_listing_geometry();

-- Function for geocoding with caching
CREATE OR REPLACE FUNCTION geocode_address(input_address TEXT)
RETURNS TABLE (
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  formatted_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT
) AS $$
DECLARE
  cached_result RECORD;
BEGIN
  -- Check if address is already geocoded
  SELECT * INTO cached_result 
  FROM geocoded_locations 
  WHERE address = input_address;
  
  IF FOUND THEN
    -- Return cached result
    RETURN QUERY SELECT 
      cached_result.latitude,
      cached_result.longitude,
      cached_result.formatted_address,
      cached_result.city,
      cached_result.state,
      cached_result.country,
      cached_result.postal_code;
  ELSE
    -- This is a placeholder for actual geocoding
    -- In production, you would integrate with a geocoding service
    -- For now, we'll return NULL values
    RETURN QUERY SELECT 
      NULL::DOUBLE PRECISION,
      NULL::DOUBLE PRECISION,
      input_address,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for reverse geocoding
CREATE OR REPLACE FUNCTION reverse_geocode(lat DOUBLE PRECISION, lng DOUBLE PRECISION)
RETURNS TABLE (
  formatted_address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT
) AS $$
DECLARE
  point_geom GEOMETRY;
  cached_result RECORD;
BEGIN
  point_geom := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
  
  -- Check for nearby cached results (within 100 meters)
  SELECT * INTO cached_result 
  FROM geocoded_locations 
  WHERE ST_DWithin(geometry, point_geom, 100)
  ORDER BY ST_Distance(geometry, point_geom)
  LIMIT 1;
  
  IF FOUND THEN
    RETURN QUERY SELECT 
      cached_result.formatted_address,
      cached_result.city,
      cached_result.state,
      cached_result.country,
      cached_result.postal_code;
  ELSE
    -- Placeholder for reverse geocoding service
    RETURN QUERY SELECT 
      'Unknown Location'::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function for geofenced search
CREATE OR REPLACE FUNCTION search_listings_geofenced(
  user_lat DOUBLE PRECISION,
  user_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10,
  search_query TEXT DEFAULT NULL,
  category_filter INTEGER DEFAULT NULL,
  min_price_filter DECIMAL DEFAULT NULL,
  max_price_filter DECIMAL DEFAULT NULL,
  condition_filter TEXT DEFAULT NULL,
  sort_by TEXT DEFAULT 'distance',
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  location TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  condition TEXT,
  featured BOOLEAN,
  images TEXT[],
  views INTEGER,
  created_at TIMESTAMPTZ,
  category_name TEXT,
  seller_name TEXT,
  seller_username TEXT,
  distance_km DOUBLE PRECISION
) AS $$
DECLARE
  user_point GEOMETRY;
BEGIN
  user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326);
  
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.description,
    l.price,
    l.location,
    l.latitude,
    l.longitude,
    l.condition,
    l.featured,
    l.images,
    l.views,
    l.created_at,
    c.name as category_name,
    p.full_name as seller_name,
    p.user_name as seller_username,
    ST_Distance(l.geometry, user_point) / 1000.0 as distance_km
  FROM listings l
  LEFT JOIN categories c ON l.category_id = c.id
  LEFT JOIN profiles p ON l.user_id = p.id
  WHERE 
    l.status = 'active'
    AND l.geometry IS NOT NULL
    AND ST_DWithin(l.geometry, user_point, radius_km * 1000)
    AND (search_query IS NULL OR (
      to_tsvector('english', l.title || ' ' || l.description) @@ plainto_tsquery('english', search_query)
      OR l.title ILIKE '%' || search_query || '%'
      OR l.description ILIKE '%' || search_query || '%'
    ))
    AND (category_filter IS NULL OR l.category_id = category_filter)
    AND (min_price_filter IS NULL OR l.price >= min_price_filter)
    AND (max_price_filter IS NULL OR l.price <= max_price_filter)
    AND (condition_filter IS NULL OR l.condition = condition_filter)
  ORDER BY 
    CASE WHEN sort_by = 'distance' THEN ST_Distance(l.geometry, user_point) END ASC,
    CASE WHEN sort_by = 'newest' THEN l.created_at END DESC,
    CASE WHEN sort_by = 'price_low' THEN l.price END ASC,
    CASE WHEN sort_by = 'price_high' THEN l.price END DESC,
    l.featured DESC,
    l.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
