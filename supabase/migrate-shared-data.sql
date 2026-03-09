-- Migrate to shared data model
-- Run this in Supabase SQL Editor to consolidate turns and treatment_notes under the first user.
-- Both Stephen and Kelsey will then see and edit the same data.

DO $$
DECLARE
    shared_user_id UUID;
BEGIN
    SELECT id INTO shared_user_id FROM users ORDER BY id ASC LIMIT 1;
    
    IF shared_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in users table';
    END IF;

    -- Turns: remove duplicates (keep most recent per date+arch), then reassign to shared user
    DELETE FROM turns WHERE id IN (
        SELECT id FROM (
            SELECT id, ROW_NUMBER() OVER (PARTITION BY date, arch ORDER BY created_at DESC) AS rn
            FROM turns
        ) sub WHERE rn > 1
    );
    UPDATE turns SET user_id = shared_user_id WHERE user_id != shared_user_id;

    -- Treatment notes: reassign all to shared user
    UPDATE treatment_notes SET user_id = shared_user_id WHERE user_id != shared_user_id;

    -- Settings: ensure shared user has a row (copy from first available if not)
    INSERT INTO settings (user_id, top_total, bottom_total, install_date, schedule_type, interval_days, child_name)
    SELECT shared_user_id, top_total, bottom_total, install_date, schedule_type, interval_days, child_name
    FROM settings
    WHERE user_id != shared_user_id
    ORDER BY updated_at DESC
    LIMIT 1
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Migration complete. Shared user_id: %', shared_user_id;
END $$;
