-- ============================================================================
-- Smart Trace: Add geofence columns to jobs table
-- ============================================================================
-- Purpose: Enable GPS-based job suggestion for offline-captured photos
-- Related: 260207_JSS离线功能与SmartTrace完整技术规格_CTO执行版.md
--
-- Phase 1 Boundaries:
--   - Smart Trace only SUGGESTS, never auto-assigns
--   - User must explicitly confirm to write job_id
--   - GPS data stored in job_photos.temp_coords for matching
-- ============================================================================

-- 1) Add geofence coordinates to jobs table
ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS geofence_lat double precision,
ADD COLUMN IF NOT EXISTS geofence_lng double precision;

-- 2) Add index for spatial queries (simple lat/lng range query for MVP)
CREATE INDEX IF NOT EXISTS idx_jobs_geofence
ON public.jobs(geofence_lat, geofence_lng)
WHERE geofence_lat IS NOT NULL AND geofence_lng IS NOT NULL;

-- 3) Add comments
COMMENT ON COLUMN public.jobs.geofence_lat IS
  'Latitude of job site center for Smart Trace GPS matching';
COMMENT ON COLUMN public.jobs.geofence_lng IS
  'Longitude of job site center for Smart Trace GPS matching';

-- ============================================================================
-- Add GPS and Smart Trace columns to job_photos
-- ============================================================================

-- 4) Add temporary coordinates captured at photo time
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS temp_lat double precision,
ADD COLUMN IF NOT EXISTS temp_lng double precision,
ADD COLUMN IF NOT EXISTS temp_accuracy_m double precision,
ADD COLUMN IF NOT EXISTS timestamp_utc timestamptz;

-- 5) Add Smart Trace metadata (suggestion only, Phase 1)
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS smart_trace_suggestion jsonb;

-- 6) Add assignment tracking
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS assignment_state text
  DEFAULT 'unassigned'
  CHECK (assignment_state IN (
    'unassigned',
    'suggested_by_smart_trace',
    'user_confirmed',
    'manually_assigned'
  ));

-- 7) Add index for Smart Trace queries
CREATE INDEX IF NOT EXISTS idx_job_photos_smart_trace
ON public.job_photos(assignment_state, temp_lat, temp_lng)
WHERE temp_lat IS NOT NULL AND assignment_state = 'unassigned';

-- 8) Add comments
COMMENT ON COLUMN public.job_photos.temp_lat IS
  'GPS latitude captured at photo time (for Smart Trace)';
COMMENT ON COLUMN public.job_photos.temp_lng IS
  'GPS longitude captured at photo time (for Smart Trace)';
COMMENT ON COLUMN public.job_photos.temp_accuracy_m IS
  'GPS accuracy in meters at capture time';
COMMENT ON COLUMN public.job_photos.timestamp_utc IS
  'UTC timestamp at capture (for Smart Trace ordering)';
COMMENT ON COLUMN public.job_photos.smart_trace_suggestion IS
  'Smart Trace suggestion metadata (job_id, distance, confidence)';
COMMENT ON COLUMN public.job_photos.assignment_state IS
  'Assignment state: unassigned → suggested → confirmed/manual';

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
DECLARE
  v_cols_jobs TEXT[];
  v_cols_photos TEXT[];
BEGIN
  SELECT array_agg(column_name) INTO v_cols_jobs
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'jobs'
    AND column_name IN ('geofence_lat', 'geofence_lng');

  SELECT array_agg(column_name) INTO v_cols_photos
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'job_photos'
    AND column_name IN ('temp_lat', 'temp_lng', 'assignment_state', 'smart_trace_suggestion');

  RAISE NOTICE '=== Smart Trace Migration Verification ===';
  RAISE NOTICE '  jobs geofence columns: %', v_cols_jobs;
  RAISE NOTICE '  job_photos Smart Trace columns: %', v_cols_photos;
  RAISE NOTICE '==========================================';
END $$;
