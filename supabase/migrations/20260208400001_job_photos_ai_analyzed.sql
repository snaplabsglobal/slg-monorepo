-- Add ai_analyzed_at column to job_photos for tracking analysis status

ALTER TABLE job_photos
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ;

-- Index for finding unanalyzed photos
CREATE INDEX IF NOT EXISTS idx_job_photos_ai_analyzed
  ON job_photos(ai_analyzed_at)
  WHERE ai_analyzed_at IS NULL AND deleted_at IS NULL;

COMMENT ON COLUMN job_photos.ai_analyzed_at IS 'Timestamp when AI analysis was completed';
