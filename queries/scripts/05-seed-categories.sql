-- Insert the 23 main categories
INSERT INTO categories (name, icon) VALUES
('Automobiles', '🚗'),
('Property', '🏠'),
('Phones & Tablets', '📱'),
('Electronics', '💻'),
('House Appliances', '🧹'),
('Furniture', '🪑'),
('Health', '💊'),
('Beauty', '💄'),
('Fashion', '👗'),
('Sports', '⚽'),
('Books', '📚'),
('Music', '🎵'),
('Games', '🎮'),
('Toys', '🧸'),
('Baby Items', '🍼'),
('Pets', '🐕'),
('Garden', '🌱'),
('Tools', '🔧'),
('Art', '🎨'),
('Jewelry', '💎'),
('Food', '🍕'),
('Services', '🛠️'),
('Jobs', '💼')
ON CONFLICT DO NOTHING;

-- Insert some common subcategories
INSERT INTO subcategories (name, parent_category_id, icon) VALUES
-- Automobiles subcategories
('Cars', 1, '🚙'),
('Motorcycles', 1, '🏍️'),
('Trucks', 1, '🚚'),
('Auto Parts', 1, '🔧'),

-- Property subcategories
('Houses', 2, '🏡'),
('Apartments', 2, '🏢'),
('Land', 2, '🌍'),
('Commercial', 2, '🏪'),

-- Phones & Tablets subcategories
('Smartphones', 3, '📱'),
('Tablets', 3, '📱'),
('Accessories', 3, '🔌'),

-- Electronics subcategories
('Laptops', 4, '💻'),
('TVs', 4, '📺'),
('Cameras', 4, '📷'),
('Audio', 4, '🎧'),

-- Fashion subcategories
('Men''s Clothing', 9, '👔'),
('Women''s Clothing', 9, '👗'),
('Shoes', 9, '👟'),
('Bags', 9, '👜')
ON CONFLICT DO NOTHING;
