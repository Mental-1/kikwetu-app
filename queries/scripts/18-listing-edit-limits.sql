-- Function to check if listing can be edited
CREATE OR REPLACE FUNCTION can_edit_listing(listing_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  listing_created TIMESTAMPTZ;
  user_uuid UUID;
  listing_owner UUID;
BEGIN
  user_uuid := auth.uid();
  
  SELECT created_at, user_id 
  INTO listing_created, listing_owner
  FROM listings
  WHERE id = listing_uuid;
  
  -- Check if user owns the listing and it's within 45 minutes
  RETURN (
    listing_owner::text = user_uuid::text AND 
    listing_created > NOW() - INTERVAL '45 minutes'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if listing can be deleted
CREATE OR REPLACE FUNCTION can_delete_listing(listing_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_uuid UUID;
  listing_owner UUID;
BEGIN
  user_uuid := auth.uid();
  
  SELECT user_id 
  INTO listing_owner
  FROM listings
  WHERE id = listing_uuid;
  
  -- User can always delete their own listings
  RETURN listing_owner::text = user_uuid::text;
END;
$$ LANGUAGE plpgsql;
