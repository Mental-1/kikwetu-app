CREATE OR REPLACE FUNCTION generate_unique_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate a random 8-character alphanumeric code
    new_code := 'ref-' || substring(md5(random()::text), 1, 8);
    -- Check if the code already exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) INTO code_exists;
    -- If the code does not exist, exit the loop
    IF NOT code_exists THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  generated_referral_code TEXT;
BEGIN
  -- Generate a unique referral code
  generated_referral_code := generate_unique_referral_code();

  INSERT INTO public.profiles (
    id,
    full_name,
    username,
    email,
    phone_number,
    referral_code
  )
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'phone_number',
    generated_referral_code
  );
  RETURN new;
END;
$$;