-- JSS Photo Analysis Queue
-- Similar to LS-Web's pending_analysis, but for job photos

CREATE TABLE IF NOT EXISTS pending_photo_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES job_photos(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Queue state
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate entries
  UNIQUE(photo_id)
);

-- Index for cron job queries
CREATE INDEX IF NOT EXISTS idx_pending_photo_analysis_queue
  ON pending_photo_analysis(status, next_attempt_at, retry_count)
  WHERE status = 'pending';

-- Index for photo lookup
CREATE INDEX IF NOT EXISTS idx_pending_photo_analysis_photo
  ON pending_photo_analysis(photo_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_pending_photo_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_photo_analysis_updated_at ON pending_photo_analysis;
CREATE TRIGGER trg_pending_photo_analysis_updated_at
  BEFORE UPDATE ON pending_photo_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_pending_photo_analysis_updated_at();

-- Comment
COMMENT ON TABLE pending_photo_analysis IS 'Queue for async photo analysis (AI tagging, scene detection, etc.)';
