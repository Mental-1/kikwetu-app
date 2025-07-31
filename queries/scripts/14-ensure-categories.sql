-- Ensure all 23 categories exist with proper IDs
INSERT INTO categories (id, name, icon) VALUES
(1, 'Automobiles', '🚗'),
(2, 'Property', '🏠'),
(3, 'Phones & Tablets', '📱'),
(4, 'Electronics', '💻'),
(5, 'House Appliances', '🧹'),
(6, 'Furniture', '🪑'),
(7, 'Health', '💊'),
(8, 'Beauty', '💄'),
(9, 'Fashion', '👗'),
(10, 'Sports', '⚽'),
(11, 'Books', '📚'),
(12, 'Music', '🎵'),
(13, 'Games', '🎮'),
(14, 'Toys', '🧸'),
(15, 'Baby Items', '🍼'),
(16, 'Pets', '🐕'),
(17, 'Garden', '🌱'),
(18, 'Tools', '🔧'),
(19, 'Art', '🎨'),
(20, 'Jewelry', '💎'),
(21, 'Food', '🍕'),
(22, 'Services', '🛠️'),
(23, 'Jobs', '💼')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    icon = EXCLUDED.icon;

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
