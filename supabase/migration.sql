-- Migration script to convert existing tracker_data JSONB history to turns table
-- Run this AFTER creating the new schema tables

-- Step 1: Migrate settings from tracker_data to settings table
INSERT INTO settings (user_id, top_total, bottom_total, install_date, interval_days, child_name, schedule_type)
SELECT 
    user_id,
    top_total,
    bottom_total,
    install_date,
    interval_days,
    child_name,
    'every_n_days' as schedule_type -- Default to every_n_days, user can change later
FROM tracker_data
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Migrate history entries to turns table
-- This extracts individual turns from the JSONB history array
INSERT INTO turns (user_id, date, arch, note, created_at)
SELECT 
    td.user_id,
    (entry->>'date')::DATE as date,
    CASE 
        -- Determine which arch was turned by comparing with previous entry
        WHEN prev_entry IS NULL THEN
            -- First entry: check if counts increased from initial state
            CASE 
                WHEN (entry->>'topDoneAfter')::INTEGER > COALESCE((entry->>'topDoneAfter')::INTEGER - 1, 0) 
                     AND (entry->>'bottomDoneAfter')::INTEGER > COALESCE((entry->>'bottomDoneAfter')::INTEGER - 1, 0) 
                THEN 'top' -- Both were turned, we'll create separate entries
                WHEN (entry->>'topDoneAfter')::INTEGER > COALESCE((entry->>'topDoneAfter')::INTEGER - 1, 0) 
                THEN 'top'
                WHEN (entry->>'bottomDoneAfter')::INTEGER > COALESCE((entry->>'bottomDoneAfter')::INTEGER - 1, 0) 
                THEN 'bottom'
                ELSE NULL
            END
        ELSE
            -- Compare with previous entry
            CASE 
                WHEN (entry->>'topDoneAfter')::INTEGER > (prev_entry->>'topDoneAfter')::INTEGER 
                     AND (entry->>'bottomDoneAfter')::INTEGER > (prev_entry->>'bottomDoneAfter')::INTEGER 
                THEN 'top' -- Both turned, we'll handle separately
                WHEN (entry->>'topDoneAfter')::INTEGER > (prev_entry->>'topDoneAfter')::INTEGER 
                THEN 'top'
                WHEN (entry->>'bottomDoneAfter')::INTEGER > (prev_entry->>'bottomDoneAfter')::INTEGER 
                THEN 'bottom'
                ELSE NULL
            END
    END as arch,
    entry->>'note' as note,
    COALESCE((entry->>'timestamp')::TIMESTAMPTZ, NOW()) as created_at
FROM tracker_data td,
LATERAL jsonb_array_elements(td.history) WITH ORDINALITY AS hist(entry, idx)
LEFT JOIN LATERAL (
    SELECT entry as prev_entry
    FROM jsonb_array_elements(td.history) WITH ORDINALITY AS prev_hist(entry, idx)
    WHERE prev_hist.idx = hist.idx + 1
    LIMIT 1
) prev ON true
WHERE td.history IS NOT NULL 
  AND jsonb_typeof(td.history) = 'array'
  AND entry->>'date' IS NOT NULL;

-- Step 3: Handle entries where both top and bottom were turned
-- We need to create separate turn entries for each arch
-- This is a more complex migration that handles "both" turns
WITH both_turns AS (
    SELECT 
        td.user_id,
        (entry->>'date')::DATE as date,
        entry->>'note' as note,
        COALESCE((entry->>'timestamp')::TIMESTAMPTZ, NOW()) as created_at,
        (entry->>'topDoneAfter')::INTEGER as top_done_after,
        (entry->>'bottomDoneAfter')::INTEGER as bottom_done_after,
        prev_entry->>'topDoneAfter' as prev_top_done_after,
        prev_entry->>'bottomDoneAfter' as prev_bottom_done_after,
        hist.idx
    FROM tracker_data td,
    LATERAL jsonb_array_elements(td.history) WITH ORDINALITY AS hist(entry, idx)
    LEFT JOIN LATERAL (
        SELECT entry as prev_entry
        FROM jsonb_array_elements(td.history) WITH ORDINALITY AS prev_hist(entry, idx)
        WHERE prev_hist.idx = hist.idx + 1
        LIMIT 1
    ) prev ON true
    WHERE td.history IS NOT NULL 
      AND jsonb_typeof(td.history) = 'array'
      AND entry->>'date' IS NOT NULL
      AND (
          -- Both arches were turned (counts increased for both)
          (prev_entry IS NULL AND (entry->>'topDoneAfter')::INTEGER > 0 AND (entry->>'bottomDoneAfter')::INTEGER > 0)
          OR
          (prev_entry IS NOT NULL 
           AND (entry->>'topDoneAfter')::INTEGER > (prev_entry->>'topDoneAfter')::INTEGER
           AND (entry->>'bottomDoneAfter')::INTEGER > (prev_entry->>'bottomDoneAfter')::INTEGER)
      )
)
INSERT INTO turns (user_id, date, arch, note, created_at)
SELECT user_id, date, 'top', note, created_at FROM both_turns
UNION ALL
SELECT user_id, date, 'bottom', note, created_at FROM both_turns
ON CONFLICT (user_id, date, arch) DO NOTHING;

-- Note: After running this migration, verify the data:
-- SELECT COUNT(*) FROM turns;
-- SELECT user_id, COUNT(*) as turn_count, MIN(date) as first_turn, MAX(date) as last_turn 
-- FROM turns GROUP BY user_id;
