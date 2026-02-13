-- Add classification fields to job_photos for AI and user classification
-- jobsite_score: 0-100 confidence score from AI
-- jobsite_reasons: JSONB with reason tags explaining classification
-- ai_classification: AI's suggestion (jobsite/personal/unsure)
-- user_classification: User's override (jobsite/personal) - takes priority over AI

ALTER TABLE public.job_photos
  ADD COLUMN IF NOT EXISTS jobsite_score SMALLINT,
  ADD COLUMN IF NOT EXISTS jobsite_reasons JSONB,
  ADD COLUMN IF NOT EXISTS ai_classification TEXT,
  ADD COLUMN IF NOT EXISTS user_classification TEXT;

-- Constraint: jobsite_score must be 0-100
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_photos_jobsite_score_range'
  ) THEN
    ALTER TABLE public.job_photos
      ADD CONSTRAINT job_photos_jobsite_score_range
      CHECK (
        jobsite_score IS NULL OR
        (jobsite_score >= 0 AND jobsite_score <= 100)
      );
  END IF;
END $$;

-- Constraint: ai_classification must be valid value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_photos_ai_classification_check'
  ) THEN
    ALTER TABLE public.job_photos
      ADD CONSTRAINT job_photos_ai_classification_check
      CHECK (
        ai_classification IS NULL OR
        ai_classification IN ('jobsite', 'personal', 'unsure')
      );
  END IF;
END $$;

-- Constraint: user_classification must be valid value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_photos_user_classification_check'
  ) THEN
    ALTER TABLE public.job_photos
      ADD CONSTRAINT job_photos_user_classification_check
      CHECK (
        user_classification IS NULL OR
        user_classification IN ('jobsite', 'personal')
      );
  END IF;
END $$;

-- Index for filtering by ai_classification within org
CREATE INDEX IF NOT EXISTS job_photos_ai_classification_idx
  ON public.job_photos (organization_id, ai_classification);

-- Index for filtering by user_classification within org
CREATE INDEX IF NOT EXISTS job_photos_user_classification_idx
  ON public.job_photos (organization_id, user_classification);

COMMENT ON COLUMN public.job_photos.jobsite_score IS 'AI confidence score 0-100 that this is a jobsite photo';
COMMENT ON COLUMN public.job_photos.jobsite_reasons IS 'JSONB with reason tags explaining AI classification';
COMMENT ON COLUMN public.job_photos.ai_classification IS 'AI suggestion: jobsite, personal, or unsure';
COMMENT ON COLUMN public.job_photos.user_classification IS 'User override: jobsite or personal (takes priority over AI)';
