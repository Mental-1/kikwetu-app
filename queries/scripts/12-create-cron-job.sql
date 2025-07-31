-- Create function to handle expired listings
CREATE OR REPLACE FUNCTION handle_expired_listings()
RETURNS void AS $$
BEGIN
  -- Update expired listings to 'expired' status
  UPDATE listings 
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' 
    AND expiry_date IS NOT NULL 
    AND expiry_date < NOW();
    
  -- Log the action
  INSERT INTO admin_logs (admin_id, action, details, created_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000', -- System user
    'expire_listings',
    jsonb_build_object(
      'expired_count', (
        SELECT COUNT(*) 
        FROM listings 
        WHERE status = 'expired' 
          AND updated_at > NOW() - INTERVAL '1 minute'
      )
    ),
    NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- Create admin_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id UUID,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Note: To set up the actual cron job, you would need to use pg_cron extension
-- or set up an external cron job that calls this function via API
-- For now, we'll create an API endpoint that can be called by Vercel Cron
