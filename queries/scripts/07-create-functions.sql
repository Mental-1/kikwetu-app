-- Function to search listings
CREATE OR REPLACE FUNCTION search_listings(
    search_query TEXT DEFAULT '',
    category_id INTEGER DEFAULT NULL,
    min_price DECIMAL DEFAULT NULL,
    max_price DECIMAL DEFAULT NULL,
    location_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    price DECIMAL,
    location TEXT,
    category_name TEXT,
    subcategory_name TEXT,
    images TEXT[],
    created_at TIMESTAMPTZ,
    user_name TEXT,
    views INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.description,
        l.price,
        l.location,
        c.name as category_name,
        sc.name as subcategory_name,
        l.images,
        l.created_at,
        p.user_name,
        l.views
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    LEFT JOIN subcategories sc ON l.subcategory_id = sc.id
    LEFT JOIN profiles p ON l.user_id = p.id
    WHERE 
        (l.status = 'active' OR l.status = 'published')
        AND (search_query = '' OR l.title ILIKE '%' || search_query || '%' OR l.description ILIKE '%' || search_query || '%')
        AND (category_id IS NULL OR l.category_id = category_id)
        AND (min_price IS NULL OR l.price >= min_price)
        AND (max_price IS NULL OR l.price <= max_price)
        AND (location_filter IS NULL OR l.location ILIKE '%' || location_filter || '%')
    ORDER BY 
        l.featured DESC,
        l.created_at DESC
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_listings INTEGER,
    active_listings INTEGER,
    total_views INTEGER,
    avg_rating DECIMAL,
    total_reviews INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(l.*)::INTEGER as total_listings,
        COUNT(CASE WHEN l.status = 'active' OR l.status = 'published' THEN 1 END)::INTEGER as active_listings,
        COALESCE(SUM(l.views), 0)::INTEGER as total_views,
        COALESCE(AVG(r.rating), 0)::DECIMAL as avg_rating,
        COUNT(r.*)::INTEGER as total_reviews
    FROM listings l
    LEFT JOIN reviews r ON r.seller_id = user_uuid
    WHERE l.user_id = user_uuid
    GROUP BY user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get similar listings
CREATE OR REPLACE FUNCTION get_similar_listings(
    listing_id INTEGER,
    limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    price DECIMAL(12, 2),
    condition listing_condition,
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    target_category_id INTEGER;
    target_price DECIMAL;
BEGIN
    -- Get the category and price of the target listing
    SELECT l.category_id, l.price INTO target_category_id, target_price
    FROM listings l
    WHERE l.id = listing_id;
    
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.price,
        l.condition,
        l.location,
        l.created_at
    FROM listings l
    WHERE 
        l.status = 'active'
        AND l.id != listing_id
        AND l.category_id = target_category_id
        AND l.price BETWEEN (target_price * 0.5) AND (target_price * 1.5)
    ORDER BY 
        ABS(l.price - target_price),
        l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing expiry
CREATE OR REPLACE FUNCTION update_expired_listings()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE listings 
    SET status = 'expired'
    WHERE status = 'active' 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE (
    listing_views_deleted INTEGER,
    search_history_deleted INTEGER,
    notifications_deleted INTEGER
) AS $$
DECLARE
    views_deleted INTEGER;
    search_deleted INTEGER;
    notif_deleted INTEGER;
BEGIN
    -- Delete listing views older than 1 year
    DELETE FROM listing_views 
    WHERE created_at < NOW() - INTERVAL '1 year';
    GET DIAGNOSTICS views_deleted = ROW_COUNT;
    
    -- Delete search history older than 6 months
    DELETE FROM search_history 
    WHERE created_at < NOW() - INTERVAL '6 months';
    GET DIAGNOSTICS search_deleted = ROW_COUNT;
    
    -- Delete read notifications older than 3 months
    DELETE FROM notifications 
    WHERE read = true AND created_at < NOW() - INTERVAL '3 months';
    GET DIAGNOSTICS notif_deleted = ROW_COUNT;
    
    RETURN QUERY SELECT views_deleted, search_deleted, notif_deleted;
END;
$$ LANGUAGE plpgsql;

-- Function to update listing view count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_uuid UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE listings 
    SET views = views + 1
    WHERE id = listing_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get trending listings (most viewed in last 7 days)
CREATE OR REPLACE FUNCTION get_trending_listings(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    title TEXT,
    price DECIMAL,
    location TEXT,
    category_name TEXT,
    images TEXT[],
    views INTEGER,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.title,
        l.price,
        l.location,
        c.name as category_name,
        l.images,
        l.views,
        l.created_at
    FROM listings l
    LEFT JOIN categories c ON l.category_id = c.id
    WHERE 
        (l.status = 'active' OR l.status = 'published')
        AND l.created_at >= NOW() - INTERVAL '7 days'
    ORDER BY l.views DESC, l.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
