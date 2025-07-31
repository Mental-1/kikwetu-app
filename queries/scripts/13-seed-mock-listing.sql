-- First ensure we have categories (in case they weren't seeded yet)
INSERT INTO categories (id, name, icon) VALUES
(1, 'Automobiles', '🚗'),
(2, 'Property', '🏠'),
(3, 'Phones & Tablets', '📱'),
(4, 'Electronics', '💻'),
(5, 'House Appliances', '🧹')
ON CONFLICT (id) DO NOTHING;

-- Ensure we have a user profile to link to
DO $$
DECLARE
    user_exists boolean;
    test_user_id uuid;
BEGIN
    -- Check if any user exists
    SELECT EXISTS(SELECT 1 FROM auth.users LIMIT 1) INTO user_exists;
    
    IF NOT user_exists THEN
        -- Create a test user if none exists
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            is_super_admin,
            role
        ) VALUES (
            '550e8400-e29b-41d4-a716-446655440001',
            'testuser@example.com',
            '$2a$10$dummy.hash.for.testing.purposes.only',
            NOW(),
            NOW(),
            NOW(),
            '{"provider": "email", "providers": ["email"]}',
            '{"email": "testuser@example.com", "full_name": "Test User"}',
            false,
            'authenticated'
        );
        
        test_user_id := '550e8400-e29b-41d4-a716-446655440001';
    ELSE
        -- Use existing user
        SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    END IF;
    
    -- Create profile for the user if it doesn't exist
    INSERT INTO profiles (
        id,
        full_name,
        user_name,
        phone,
        bio,
        avatar_url,
        location,
        authenticated,
        email_notifications,
        push_notifications
    ) VALUES (
        test_user_id,
        'John Doe',
        'johndoe',
        '+254712345678',
        'Tech enthusiast and gadget collector. Selling quality items at great prices.',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        'Nairobi, Kenya',
        true,
        true,
        false
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        user_name = EXCLUDED.user_name,
        phone = EXCLUDED.phone,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        location = EXCLUDED.location;
    
    -- Insert the mock listing
    INSERT INTO listings (
        id,
        title,
        description,
        price,
        location,
        latitude,
        longitude,
        condition,
        category_id,
        user_id,
        status,
        images,
        views,
        created_at,
        updated_at,
        expiry_date
    ) VALUES (
        '550e8400-e29b-41d4-a716-446655440000',
        'iPhone 13 Pro Max - 256GB Space Gray',
        'Excellent condition iPhone 13 Pro Max with 256GB storage. Barely used, always kept in a case with screen protector. Comes with original box, charger, and unused EarPods. Battery health is at 98%. No scratches or dents. Selling because I upgraded to iPhone 14 Pro.

Features:
• 256GB Storage
• Space Gray Color
• 98% Battery Health
• Original Box & Accessories
• Screen Protector Applied
• Always in Case

Perfect for anyone looking for a premium smartphone at a great price. Serious buyers only please.',
        899.00,
        'Nairobi CBD, Kenya',
        -1.2921,
        36.8219,
        'excellent',
        3, -- Phones & Tablets category
        test_user_id,
        'active',
        ARRAY[
            'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400&h=400&fit=crop',
            'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=400&h=400&fit=crop'
        ],
        127,
        NOW() - INTERVAL '2 days',
        NOW() - INTERVAL '1 hour',
        NOW() + INTERVAL '28 days'
    ) ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        location = EXCLUDED.location,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude,
        condition = EXCLUDED.condition,
        images = EXCLUDED.images,
        views = EXCLUDED.views,
        updated_at = NOW();
        
END $$;
