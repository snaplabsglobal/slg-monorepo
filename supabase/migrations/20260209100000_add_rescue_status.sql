-- Add rescue_status field to job_photos
-- Required for Rescue Mode state machine
-- Values: 'unreviewed' | 'confirmed' | 'skipped'

-- Add the column with default 'unreviewed'
ALTER TABLE job_photos
ADD COLUMN IF NOT EXISTS rescue_status TEXT DEFAULT 'unreviewed';

-- Add check constraint for valid values
ALTER TABLE job_photos
ADD CONSTRAINT job_photos_rescue_status_check
CHECK (rescue_status IN ('unreviewed', 'confirmed', 'skipped'));

-- Create index for Rescue Mode queries
-- Rescue only processes: job_id IS NULL AND rescue_status = 'unreviewed'
CREATE INDEX IF NOT EXISTS idx_job_photos_rescue_candidates
ON job_photos (organization_id, job_id, rescue_status)
WHERE job_id IS NULL AND rescue_status = 'unreviewed' AND deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN job_photos.rescue_status IS 'Rescue Mode status: unreviewed (default), confirmed (assigned to job), skipped (intentionally ignored)';
