-- This script sets up a daily cron job to delete abandoned listings.

-- 1. Create a function to delete listings that have been in a 'pending' state for over 24 hours.
CREATE OR REPLACE FUNCTION delete_abandoned_listings()
RETURNS void AS $$
BEGIN
    -- First, delete associated transactions to maintain referential integrity
    DELETE FROM public.transactions
    WHERE listing_id IN (
        SELECT id FROM public.listings
        WHERE status = 'pending' AND created_at < now() - interval '24 hours'
    );

    -- Now, delete the abandoned listings
    DELETE FROM public.listings
    WHERE status = 'pending' AND created_at < now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- 2. Schedule the function to run once daily at midnight UTC.
-- The cron job is unscheduled first to prevent errors on re-running the script.
SELECT cron.unschedule('delete-abandoned-listings');
SELECT cron.schedule('delete-abandoned-listings', '0 0 * * *', 'SELECT delete_abandoned_listings()');

-- To check the status of your cron jobs, you can run:
-- SELECT * FROM cron.job;

-- To manually run the job, you can use:
-- SELECT delete_abandoned_listings();
