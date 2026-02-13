-- Backfill rescue_status for existing photos
-- Problem: ADD COLUMN ... DEFAULT only sets default for NEW rows
-- Existing rows have NULL rescue_status, causing candidates=0 in Rescue Mode

-- Step 1: Backfill NULL → 'unreviewed' for unassigned photos
UPDATE job_photos
SET rescue_status = 'unreviewed'
WHERE rescue_status IS NULL
  AND job_id IS NULL
  AND deleted_at IS NULL;

-- Step 2: Backfill NULL → 'confirmed' for photos already in jobs
-- (they were assigned before Rescue Mode existed)
UPDATE job_photos
SET rescue_status = 'confirmed'
WHERE rescue_status IS NULL
  AND job_id IS NOT NULL
  AND deleted_at IS NULL;

-- Step 3: Handle deleted photos (set to 'skipped' to exclude from Rescue)
UPDATE job_photos
SET rescue_status = 'skipped'
WHERE rescue_status IS NULL
  AND deleted_at IS NOT NULL;

-- Step 4: Safety net - any remaining NULLs become 'unreviewed'
UPDATE job_photos
SET rescue_status = 'unreviewed'
WHERE rescue_status IS NULL;

-- Step 5: Add NOT NULL constraint now that all rows have values
-- (This ensures no future NULL values)
ALTER TABLE job_photos
ALTER COLUMN rescue_status SET NOT NULL;

-- Verify: This should return 0 rows
-- SELECT COUNT(*) FROM job_photos WHERE rescue_status IS NULL;

COMMENT ON COLUMN job_photos.rescue_status IS
  'Rescue Mode status: unreviewed (default for new photos), confirmed (assigned to job via Rescue or manually), skipped (user chose to ignore). NOT NULL after backfill migration.';
