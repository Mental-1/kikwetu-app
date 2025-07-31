-- Add featured columns to listings
ALTER TABLE listings 
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS featured_tier TEXT CHECK (featured_tier IN ('premium', 'premium_plus'));

-- Create featured listings index
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings(featured, featured_until) WHERE featured = true;

-- Function to check if listing can be featured
CREATE OR REPLACE FUNCTION can_feature_listing(
  user_uuid UUID,
  listing_uuid UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  user_plan TEXT;
  listing_owner UUID;
BEGIN
  -- Get user's current plan
  SELECT plan INTO user_plan
  FROM plans p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE pr.id = user_uuid
  AND p.created_at <= NOW()
  ORDER BY p.created_at DESC
  LIMIT 1;
  
  -- Get listing owner
  SELECT user_id INTO listing_owner
  FROM listings
  WHERE id = listing_uuid;
  
  -- Check if user owns the listing and has premium/premium_plus plan
  RETURN (
    listing_owner = user_uuid AND 
    user_plan IN ('premium', 'premium_plus')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to feature a listing
CREATE OR REPLACE FUNCTION feature_listing(
  listing_uuid UUID,
  duration_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  
  -- Check if user can feature this listing
  IF NOT can_feature_listing(user_uuid, listing_uuid) THEN
    RETURN FALSE;
  END IF;
  
  -- Update listing to be featured
  UPDATE listings
  SET 
    featured = TRUE,
    featured_until = NOW() + (duration_days || ' days')::INTERVAL,
    featured_tier = (
      SELECT plan 
      FROM plans p
      JOIN profiles pr ON p.user_id = pr.id
      WHERE pr.id = user_uuid
      ORDER BY p.created_at DESC
      LIMIT 1
    ),
    updated_at = NOW()
  WHERE id = listing_uuid;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to unfeature expired listings
CREATE OR REPLACE FUNCTION unfeature_expired_listings()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE listings
  SET 
    featured = FALSE,
    featured_until = NULL,
    featured_tier = NULL,
    updated_at = NOW()
  WHERE featured = TRUE 
    AND featured_until < NOW();
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
