-- Insert default subscription plans
INSERT INTO plans (name, price, duration, max_listings, features) VALUES
('Free', 0.00, 30, 2, '["Basic listing", "2 photos per listing", "Standard support"]'),
('Basic', 9.99, 30, 10, '["Enhanced listing", "5 photos per listing", "Priority placement", "Email support"]'),
('Premium', 29.99, 30, 50, '["Premium listing", "10 photos per listing", "Featured placement", "Priority support", "Analytics"]'),
('Enterprise', 99.99, 30, 999, '["Unlimited listings", "Unlimited photos", "Top placement", "Dedicated support", "Advanced analytics", "Custom branding"]')
ON CONFLICT DO NOTHING;
