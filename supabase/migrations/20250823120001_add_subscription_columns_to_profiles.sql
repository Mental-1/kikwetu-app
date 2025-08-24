ALTER TABLE profiles
ADD COLUMN current_plan_id TEXT REFERENCES plans(id),
ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
