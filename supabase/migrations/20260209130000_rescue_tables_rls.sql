-- Rescue Mode v1: RLS Policies
-- Required for Supabase to allow queries on the normalized tables

-- ============================================================
-- 1. rescue_scans RLS
-- ============================================================

ALTER TABLE rescue_scans ENABLE ROW LEVEL SECURITY;

-- Users can view their org's scans
CREATE POLICY "Users can view org scans"
ON rescue_scans FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can create scans for their org
CREATE POLICY "Users can create org scans"
ON rescue_scans FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can update their org's scans
CREATE POLICY "Users can update org scans"
ON rescue_scans FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 2. rescue_clusters RLS
-- ============================================================

ALTER TABLE rescue_clusters ENABLE ROW LEVEL SECURITY;

-- Users can view their org's clusters
CREATE POLICY "Users can view org clusters"
ON rescue_clusters FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can create clusters for their org
CREATE POLICY "Users can create org clusters"
ON rescue_clusters FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can update their org's clusters
CREATE POLICY "Users can update org clusters"
ON rescue_clusters FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 3. rescue_unknown RLS
-- ============================================================

ALTER TABLE rescue_unknown ENABLE ROW LEVEL SECURITY;

-- Users can view their org's unknown photos
CREATE POLICY "Users can view org unknown"
ON rescue_unknown FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can create unknown records for their org
CREATE POLICY "Users can create org unknown"
ON rescue_unknown FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can update their org's unknown records
CREATE POLICY "Users can update org unknown"
ON rescue_unknown FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 4. idempotency_keys RLS
-- ============================================================

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Users can view their org's idempotency keys
CREATE POLICY "Users can view org idempotency keys"
ON idempotency_keys FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Users can create idempotency keys for their org
CREATE POLICY "Users can create org idempotency keys"
ON idempotency_keys FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON POLICY "Users can view org scans" ON rescue_scans IS 'Org members can view all scans in their org';
COMMENT ON POLICY "Users can create org scans" ON rescue_scans IS 'Org members can create scans in their org';
COMMENT ON POLICY "Users can update org scans" ON rescue_scans IS 'Org members can update scans in their org';

COMMENT ON POLICY "Users can view org clusters" ON rescue_clusters IS 'Org members can view all clusters in their org';
COMMENT ON POLICY "Users can create org clusters" ON rescue_clusters IS 'Org members can create clusters in their org';
COMMENT ON POLICY "Users can update org clusters" ON rescue_clusters IS 'Org members can update clusters in their org';

COMMENT ON POLICY "Users can view org unknown" ON rescue_unknown IS 'Org members can view unknown photo records in their org';
COMMENT ON POLICY "Users can create org unknown" ON rescue_unknown IS 'Org members can create unknown records in their org';
COMMENT ON POLICY "Users can update org unknown" ON rescue_unknown IS 'Org members can update unknown records in their org';

COMMENT ON POLICY "Users can view org idempotency keys" ON idempotency_keys IS 'Org members can view idempotency keys for caching';
COMMENT ON POLICY "Users can create org idempotency keys" ON idempotency_keys IS 'Org members can create idempotency keys';
