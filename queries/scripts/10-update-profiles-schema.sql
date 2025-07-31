-- Update profiles table to include missing fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

-- Update the profiles table to sync email from auth.users
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles 
  SET email = NEW.email 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync email from auth.users to profiles
DROP TRIGGER IF EXISTS sync_user_email_trigger ON auth.users;
CREATE TRIGGER sync_user_email_trigger
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_nationality ON profiles(nationality);
CREATE INDEX IF NOT EXISTS idx_profiles_birth_date ON profiles(birth_date);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
