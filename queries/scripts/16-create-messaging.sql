-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  encryption_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(listing_id, buyer_id, seller_id)
);

-- Create messages table with encryption
CREATE TABLE IF NOT EXISTS encrypted_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  encrypted_content TEXT NOT NULL,
  iv TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer_id ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_seller_id ON conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON encrypted_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON encrypted_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON encrypted_messages(created_at);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations
  FOR SELECT USING (
    auth.uid()::text = buyer_id::text OR 
    auth.uid()::text = seller_id::text
  );

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (
    auth.uid()::text = buyer_id::text OR 
    auth.uid()::text = seller_id::text
  );

-- RLS policies for messages
CREATE POLICY "Users can view messages in their conversations" ON encrypted_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
      AND (c.buyer_id::text = auth.uid()::text OR c.seller_id::text = auth.uid()::text)
    )
  );

CREATE POLICY "Users can send messages in their conversations" ON encrypted_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
      AND (c.buyer_id::text = auth.uid()::text OR c.seller_id::text = auth.uid()::text)
    )
    AND sender_id::text = auth.uid()::text
  );

-- Function to get or create conversation
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_seller_id UUID,
  p_encryption_key TEXT
)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO conversation_id
  FROM conversations
  WHERE listing_id = p_listing_id 
    AND buyer_id = p_buyer_id 
    AND seller_id = p_seller_id;
  
  -- If not found, create new conversation
  IF conversation_id IS NULL THEN
    INSERT INTO conversations (listing_id, buyer_id, seller_id, encryption_key)
    VALUES (p_listing_id, p_buyer_id, p_seller_id, p_encryption_key)
    RETURNING id INTO conversation_id;
  END IF;
  
  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql;
