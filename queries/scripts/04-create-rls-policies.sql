-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Listings policies
CREATE POLICY "Active listings are viewable by everyone" ON listings
    FOR SELECT USING (status = 'active' OR status = 'published');

CREATE POLICY "Users can view own listings" ON listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own listings" ON listings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings" ON listings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings" ON listings
    FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages" ON messages
    FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "Users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews" ON reviews
    FOR UPDATE USING (auth.uid() = reviewer_id);

-- Saved listings policies
CREATE POLICY "Users can view own saved listings" ON saved_listings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved listings" ON saved_listings
    FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Plans policies
CREATE POLICY "Plans are viewable by everyone" ON plans
    FOR SELECT USING (true);

CREATE POLICY "Users can view own plans" ON plans
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Categories and subcategories are public read-only
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Subcategories are viewable by everyone" ON subcategories
    FOR SELECT USING (true);
