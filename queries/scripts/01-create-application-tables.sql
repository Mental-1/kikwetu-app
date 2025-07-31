-- Create application tables to match the Prisma schema

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subcategories table
CREATE TABLE IF NOT EXISTS subcategories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    parent_category_id INTEGER NOT NULL REFERENCES categories(id),
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price DECIMAL NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    features JSONB,
    duration INTEGER NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    max_listings INTEGER DEFAULT 2
);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    bio TEXT,
    avatar_url TEXT,
    location TEXT,
    listing_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    authenticated BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT FALSE,
    user_name TEXT UNIQUE NOT NULL
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2),
    location TEXT,
    category_id INTEGER REFERENCES categories(id),
    subcategory_id INTEGER REFERENCES subcategories(id),
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft',
    payment_status TEXT DEFAULT 'unpaid',
    plan TEXT,
    images TEXT[],
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    plan_id UUID REFERENCES plans(id),
    plan_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    condition TEXT,
    featured BOOLEAN DEFAULT FALSE
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id),
    receiver_id UUID REFERENCES profiles(id),
    listing_id UUID REFERENCES listings(id),
    content TEXT,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    reviewer_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved listings table
CREATE TABLE IF NOT EXISTS saved_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    listing_id UUID REFERENCES listings(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id),
    user_id UUID REFERENCES auth.users(id),
    payment_method TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    reference TEXT,
    phone_number TEXT,
    email TEXT,
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
