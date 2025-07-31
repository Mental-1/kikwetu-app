-- View for active listings with user and category info
CREATE VIEW active_listings_view AS
SELECT 
    l.id,
    l.title,
    l.description,
    l.price,
    l.original_price,
    l.negotiable,
    l.condition,
    l.location,
    l.latitude,
    l.longitude,
    l.featured,
    l.views_count,
    l.saves_count,
    l.created_at,
    l.updated_at,
    p.username as seller_username,
    p.full_name as seller_name,
    p.avatar_url as seller_avatar,
    p.rating as seller_rating,
    p.reviews_count as seller_reviews,
    c.name as category_name,
    c.slug as category_slug,
    sc.name as subcategory_name,
    sc.slug as subcategory_slug,
    (
        SELECT json_agg(
            json_build_object(
                'id', li.id,
                'url', li.url,
                'alt_text', li.alt_text,
                'is_primary', li.is_primary,
                'sort_order', li.sort_order
            ) ORDER BY li.sort_order, li.id
        )
        FROM listing_images li 
        WHERE li.listing_id = l.id
    ) as images,
    (
        SELECT json_agg(
            json_build_object(
                'name', ls.name,
                'value', ls.value
            )
        )
        FROM listing_specifications ls 
        WHERE ls.listing_id = l.id
    ) as specifications
FROM listings l
JOIN profiles p ON l.user_id = p.id
JOIN categories c ON l.category_id = c.id
LEFT JOIN categories sc ON l.subcategory_id = sc.id
WHERE l.status = 'active' AND p.status = 'active';

-- View for user dashboard statistics
CREATE VIEW user_dashboard_stats AS
SELECT 
    p.id as user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.rating,
    p.reviews_count,
    p.total_sales,
    p.total_purchases,
    p.created_at as member_since,
    COUNT(CASE WHEN l.status = 'active' THEN 1 END) as active_listings,
    COUNT(CASE WHEN l.status = 'sold' THEN 1 END) as sold_listings,
    COUNT(CASE WHEN l.status = 'expired' THEN 1 END) as expired_listings,
    COALESCE(SUM(l.views_count), 0) as total_views,
    COALESCE(SUM(l.saves_count), 0) as total_saves,
    COUNT(CASE WHEN n.read = false THEN 1 END) as unread_notifications,
    COUNT(CASE WHEN m.status = 'sent' AND m.recipient_id = p.id THEN 1 END) as unread_messages
FROM profiles p
LEFT JOIN listings l ON p.id = l.user_id
LEFT JOIN notifications n ON p.id = n.user_id
LEFT JOIN messages m ON p.id = m.recipient_id AND m.read_at IS NULL
WHERE p.status = 'active'
GROUP BY p.id, p.username, p.full_name, p.avatar_url, p.rating, p.reviews_count, 
         p.total_sales, p.total_purchases, p.created_at;

-- View for popular categories
CREATE VIEW popular_categories_view AS
SELECT 
    c.id,
    c.name,
    c.slug,
    c.icon,
    c.description,
    COUNT(l.id) as listing_count,
    AVG(l.price) as avg_price,
    MIN(l.price) as min_price,
    MAX(l.price) as max_price
FROM categories c
LEFT JOIN listings l ON c.id = l.category_id AND l.status = 'active'
WHERE c.parent_id IS NULL AND c.is_active = true
GROUP BY c.id, c.name, c.slug, c.icon, c.description
ORDER BY listing_count DESC, c.sort_order;

-- View for recent transactions
CREATE VIEW recent_transactions_view AS
SELECT 
    t.id,
    t.amount,
    t.fee_amount,
    t.net_amount,
    t.currency,
    t.payment_method,
    t.status,
    t.type,
    t.created_at,
    t.completed_at,
    bp.username as buyer_username,
    bp.full_name as buyer_name,
    sp.username as seller_username,
    sp.full_name as seller_name,
    l.title as listing_title,
    l.price as listing_price
FROM transactions t
JOIN profiles bp ON t.buyer_id = bp.id
JOIN profiles sp ON t.seller_id = sp.id
JOIN listings l ON t.listing_id = l.id
ORDER BY t.created_at DESC;

-- View for trending listings (most viewed in last 7 days)
CREATE VIEW trending_listings_view AS
SELECT 
    l.id,
    l.title,
    l.price,
    l.condition,
    l.location,
    l.created_at,
    p.username as seller_username,
    p.rating as seller_rating,
    c.name as category_name,
    COUNT(lv.id) as recent_views,
    l.views_count as total_views
FROM listings l
JOIN profiles p ON l.user_id = p.id
JOIN categories c ON l.category_id = c.id
LEFT JOIN listing_views lv ON l.id = lv.listing_id 
    AND lv.created_at >= NOW() - INTERVAL '7 days'
WHERE l.status = 'active'
GROUP BY l.id, l.title, l.price, l.condition, l.location, l.created_at,
         p.username, p.rating, c.name, l.views_count
HAVING COUNT(lv.id) > 0
ORDER BY recent_views DESC, l.views_count DESC
LIMIT 50;
