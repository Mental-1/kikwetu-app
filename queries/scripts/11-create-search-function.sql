-- Create comprehensive search function
CREATE OR REPLACE FUNCTION search_listings(
  search_query TEXT DEFAULT NULL,
  category_filter INTEGER DEFAULT NULL,
  subcategory_filter INTEGER DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  min_price_filter DECIMAL DEFAULT NULL,
  max_price_filter DECIMAL DEFAULT NULL,
  condition_filter TEXT DEFAULT NULL,
  user_lat FLOAT DEFAULT NULL,
  user_lng FLOAT DEFAULT NULL,
  radius_km INTEGER DEFAULT 50,
  sort_by TEXT DEFAULT 'relevance',
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  location TEXT,
  latitude FLOAT,
  longitude FLOAT,
  condition TEXT,
  featured BOOLEAN,
  images TEXT[],
  views INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  category_id INTEGER,
  category_name TEXT,
  subcategory_id INTEGER,
  subcategory_name TEXT,
  user_id UUID,
  seller_name TEXT,
  seller_username TEXT,
  seller_avatar TEXT,
  distance_km FLOAT
) AS $$
BEGIN
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
    l.updated_at,
    l.category_id,
    c.name as category_name,
    l.subcategory_id,
    sc.name as subcategory_name,
    l.user_id,
    p.full_name as seller_name,
    p.user_name as seller_username,
    p.avatar_url as seller_avatar,
    CASE 
      WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL AND l.latitude IS NOT NULL AND l.longitude IS NOT NULL
      THEN ST_Distance(
        ST_Point(user_lng, user_lat)::geography,
        ST_Point(l.longitude, l.latitude)::geography
      ) / 1000.0
      ELSE NULL
    END as distance_km
  FROM listings l
  LEFT JOIN categories c ON l.category_id = c.id
  LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
  LEFT JOIN profiles p ON l.user_id = p.id
  WHERE 
    l.status = 'active'
    AND (search_query IS NULL OR (
      to_tsvector('english', l.title || ' ' || l.description) @@ plainto_tsquery('english', search_query)
      OR l.title ILIKE '%' || search_query || '%'
      OR l.description ILIKE '%' || search_query || '%'
    ))
    AND (category_filter IS NULL OR l.category_id = category_filter)
    AND (subcategory_filter IS NULL OR l.subcategory_id = subcategory_filter)
    AND (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
    AND (min_price_filter IS NULL OR l.price >= min_price_filter)
    AND (max_price_filter IS NULL OR l.price <= max_price_filter)
    AND (condition_filter IS NULL OR l.condition = condition_filter)
    AND (
      user_lat IS NULL OR user_lng IS NULL OR l.latitude IS NULL OR l.longitude IS NULL
      OR ST_Distance(
        ST_Point(user_lng, user_lat)::geography,
        ST_Point(l.longitude, l.latitude)::geography
      ) <= radius_km * 1000
    )
  ORDER BY 
    CASE 
      WHEN sort_by = 'newest' THEN l.created_at
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'price_low' THEN l.price
      ELSE NULL
    END ASC,
    CASE 
      WHEN sort_by = 'price_high' THEN l.price
      ELSE NULL
    END DESC,
    CASE 
      WHEN sort_by = 'distance' AND user_lat IS NOT NULL AND user_lng IS NOT NULL 
      THEN ST_Distance(
        ST_Point(user_lng, user_lat)::geography,
        ST_Point(l.longitude, l.latitude)::geography
      )
      ELSE NULL
    END ASC,
    l.featured DESC,
    l.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
