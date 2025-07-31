-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_plans_updated_at 
    BEFORE UPDATE ON plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at 
    BEFORE UPDATE ON listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at 
    BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at 
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user rating when a new review is added
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles 
    SET 
        rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews 
            WHERE reviewed_user_id = NEW.reviewed_user_id
        ),
        reviews_count = (
            SELECT COUNT(*)
            FROM reviews 
            WHERE reviewed_user_id = NEW.reviewed_user_id
        )
    WHERE id = NEW.reviewed_user_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating user rating
CREATE TRIGGER update_user_rating_trigger AFTER INSERT ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_user_rating();

-- Function to update listing view count
CREATE OR REPLACE FUNCTION update_listing_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE listings 
    SET views_count = views_count + 1
    WHERE id = NEW.listing_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating listing views
CREATE TRIGGER update_listing_views_trigger AFTER INSERT ON listing_views
    FOR EACH ROW EXECUTE FUNCTION update_listing_views();

-- Function to update listing saves count
CREATE OR REPLACE FUNCTION update_listing_saves()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE listings 
        SET saves_count = saves_count + 1
        WHERE id = NEW.listing_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE listings 
        SET saves_count = saves_count - 1
        WHERE id = OLD.listing_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Triggers for updating listing saves
CREATE TRIGGER update_listing_saves_insert_trigger AFTER INSERT ON saved_listings
    FOR EACH ROW EXECUTE FUNCTION update_listing_saves();

CREATE TRIGGER update_listing_saves_delete_trigger AFTER DELETE ON saved_listings
    FOR EACH ROW EXECUTE FUNCTION update_listing_saves();

-- Function to update user sales/purchases count
CREATE OR REPLACE FUNCTION update_user_transaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Update seller's sales count
        UPDATE profiles 
        SET total_sales = total_sales + 1
        WHERE id = NEW.seller_id;
        
        -- Update buyer's purchases count
        UPDATE profiles 
        SET total_purchases = total_purchases + 1
        WHERE id = NEW.buyer_id;
        
        -- Mark listing as sold
        UPDATE listings 
        SET 
            status = 'sold',
            sold_at = NOW(),
            sold_to_user_id = NEW.buyer_id
        WHERE id = NEW.listing_id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updating transaction counts
CREATE TRIGGER update_user_transaction_counts_trigger AFTER UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_user_transaction_counts();
