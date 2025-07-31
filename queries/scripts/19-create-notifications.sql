-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('listing', 'account', 'marketing', 'message')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created ON notifications(user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Create function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications 
    SET read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE id = notification_id AND user_id = auth.uid();
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(user_uuid UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    target_user_id UUID;
    updated_count INTEGER;
BEGIN
    target_user_id := COALESCE(user_uuid, auth.uid());
    
    UPDATE notifications 
    SET read = TRUE, read_at = NOW(), updated_at = NOW()
    WHERE user_id = target_user_id AND read = FALSE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to create notifications
CREATE OR REPLACE FUNCTION create_notification(
    target_user_id UUID,
    notification_type VARCHAR(50),
    notification_title VARCHAR(255),
    notification_message TEXT,
    notification_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (target_user_id, notification_type, notification_title, notification_message, notification_data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clean up old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for automatic notification creation
CREATE OR REPLACE FUNCTION trigger_listing_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify when listing is approved
    IF OLD.status = 'pending_approval' AND NEW.status = 'active' THEN
        PERFORM create_notification(
            NEW.user_id,
            'listing',
            'Listing Approved',
            'Your listing "' || NEW.title || '" has been approved and is now live!',
            jsonb_build_object('listing_id', NEW.id, 'action', 'approved')
        );
    END IF;
    
    -- Notify when listing is expiring (1 day before)
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date <= NOW() + INTERVAL '1 day' AND NEW.status = 'active' THEN
        PERFORM create_notification(
            NEW.user_id,
            'listing',
            'Listing Expiring Soon',
            'Your listing "' || NEW.title || '" will expire in less than 24 hours.',
            jsonb_build_object('listing_id', NEW.id, 'action', 'expiring', 'expiry_date', NEW.expiry_date)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for listing notifications
DROP TRIGGER IF EXISTS listing_notifications_trigger ON listings;
CREATE TRIGGER listing_notifications_trigger
    AFTER UPDATE ON listings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_listing_notifications();
