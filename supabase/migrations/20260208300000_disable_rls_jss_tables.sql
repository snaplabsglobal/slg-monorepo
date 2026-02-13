-- ============================================================================
-- Disable RLS for JSS (JobSite Snap) Tables
-- ============================================================================
-- This migration disables Row Level Security for JSS-specific tables to fix
-- 500 errors on job/photo operations.
--
-- Tables affected:
-- - jobs (soft delete was failing)
-- - job_photos
-- - job_areas
-- - job_trades
-- - evidence_sets
-- - evidence_set_items
-- - share_links
-- ============================================================================

-- Disable RLS for jobs table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
    ALTER TABLE public.jobs DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ jobs: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ jobs: table does not exist';
  END IF;
END $$;

-- Disable RLS for job_photos table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_photos') THEN
    ALTER TABLE public.job_photos DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ job_photos: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ job_photos: table does not exist';
  END IF;
END $$;

-- Disable RLS for job_areas table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_areas') THEN
    ALTER TABLE public.job_areas DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ job_areas: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ job_areas: table does not exist';
  END IF;
END $$;

-- Disable RLS for job_trades table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'job_trades') THEN
    ALTER TABLE public.job_trades DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ job_trades: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ job_trades: table does not exist';
  END IF;
END $$;

-- Disable RLS for evidence_sets table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'evidence_sets') THEN
    ALTER TABLE public.evidence_sets DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ evidence_sets: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ evidence_sets: table does not exist';
  END IF;
END $$;

-- Disable RLS for evidence_set_items table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'evidence_set_items') THEN
    ALTER TABLE public.evidence_set_items DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ evidence_set_items: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ evidence_set_items: table does not exist';
  END IF;
END $$;

-- Disable RLS for share_links table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'share_links') THEN
    ALTER TABLE public.share_links DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ share_links: RLS DISABLED';
  ELSE
    RAISE NOTICE '⚠️ share_links: table does not exist';
  END IF;
END $$;

-- Verification
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['jobs', 'job_photos', 'job_areas', 'job_trades', 'evidence_sets', 'evidence_set_items', 'share_links'];
  v_table TEXT;
  v_rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE '=================================';
  RAISE NOTICE 'JSS Tables RLS Status:';
  RAISE NOTICE '=================================';

  FOREACH v_table IN ARRAY v_tables
  LOOP
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = v_table;

    IF v_rls_enabled IS NULL THEN
      RAISE NOTICE '⚠️ %: table not found', v_table;
    ELSIF v_rls_enabled THEN
      RAISE NOTICE '⚠️ %: RLS ENABLED (should be disabled)', v_table;
    ELSE
      RAISE NOTICE '✅ %: RLS DISABLED', v_table;
    END IF;
  END LOOP;

  RAISE NOTICE '=================================';
END $$;
