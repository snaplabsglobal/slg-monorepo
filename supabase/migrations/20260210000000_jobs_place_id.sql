-- ============================================================================
-- Add Google Places place_id to jobs table
-- ============================================================================
-- Purpose: Enable address standardization via Google Places Autocomplete
-- Related: 260208_JSS_Job地址标准化完整规范.md
--
-- Key Points:
--   - place_id is the unique identifier from Google Places
--   - Used for Job de-duplication and address verification
--   - All new Jobs should have place_id set via Autocomplete
-- ============================================================================

-- 1) Add place_id column
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS place_id VARCHAR(255);

-- 2) Add index for place_id lookups (Job de-duplication)
CREATE INDEX IF NOT EXISTS idx_jobs_place_id
ON public.jobs(place_id)
WHERE place_id IS NOT NULL;

-- 3) Add comment
COMMENT ON COLUMN public.jobs.place_id IS
  'Google Places place_id for address standardization';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'place_id'
  ) THEN
    RAISE NOTICE '✓ jobs.place_id column added successfully';
  ELSE
    RAISE EXCEPTION 'Failed to add place_id column';
  END IF;
END $$;
