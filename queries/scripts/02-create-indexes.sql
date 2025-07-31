-- Create indexes to match Prisma schema

-- Subcategories indexes
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_category_id ON subcategories(parent_category_id);

-- Plans indexes
CREATE INDEX IF NOT EXISTS idx_plans_user_id ON plans(user_id);

-- Listings indexes
CREATE INDEX IF NOT EXISTS idx_listings_category_id ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_subcategory_id ON listings(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Reviews indexes
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON reviews(seller_id);

-- Saved listings indexes
CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id ON saved_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON saved_listings(user_id);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_listing_id ON transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
