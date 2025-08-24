CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES plans(id), -- Assuming 'plans' table exists with 'id'
  transaction_id UUID REFERENCES transactions(id), -- Link to the transaction that initiated this subscription
  status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'expired'
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions." ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions." ON subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin can do anything
CREATE POLICY "Admins can manage all subscriptions." ON subscriptions
  FOR ALL USING (auth.role() = 'admin');
