-- Insert subscription plans
INSERT INTO subscription_plans (
    name, display_name, description, price, currency, billing_period,
    max_listings, max_images_per_listing, video_uploads, featured_listings,
    priority_support, analytics, is_active
) VALUES
(
    'free', 'Free Plan', 
    'Basic listing features for casual sellers',
    0.00, 'USD', 'monthly',
    5, 3, false, false, false, false, true
),
(
    'basic', 'Basic Plan',
    'Enhanced features for regular sellers',
    9.99, 'USD', 'monthly',
    25, 8, false, true, false, true, true
),
(
    'premium', 'Premium Plan',
    'Advanced features for serious sellers',
    29.99, 'USD', 'monthly',
    100, 15, true, true, true, true, true
),
(
    'enterprise', 'Enterprise Plan',
    'Unlimited features for business sellers',
    99.99, 'USD', 'monthly',
    NULL, NULL, true, true, true, true, true
);
