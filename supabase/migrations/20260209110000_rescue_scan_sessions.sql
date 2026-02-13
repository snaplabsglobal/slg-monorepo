-- Rescue Scan Sessions table
-- Stores scan session state for resume/progress tracking

CREATE TABLE IF NOT EXISTS rescue_scan_sessions (
  id TEXT PRIMARY KEY,  -- 'rs_01J...XYZ' format
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL,

  -- Scope
  scope_mode TEXT NOT NULL DEFAULT 'unassigned',

  -- Stats (computed at scan time)
  stats JSONB NOT NULL DEFAULT '{}',
  date_range JSONB NOT NULL DEFAULT '{}',

  -- Clusters (computed at scan time)
  clusters JSONB NOT NULL DEFAULT '[]',
  unknown_photo_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Progress tracking
  clusters_confirmed TEXT[] NOT NULL DEFAULT '{}',
  clusters_skipped TEXT[] NOT NULL DEFAULT '{}',
  unknown_assigned_ids TEXT[] NOT NULL DEFAULT '{}',
  unknown_skipped_ids TEXT[] NOT NULL DEFAULT '{}',

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'applied', 'expired')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_rescue_scan_sessions_user
ON rescue_scan_sessions(organization_id, user_id, status);

-- Idempotency keys table
CREATE TABLE IF NOT EXISTS rescue_idempotency_keys (
  key TEXT PRIMARY KEY,
  organization_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-expire old keys (7 days)
CREATE INDEX IF NOT EXISTS idx_rescue_idempotency_keys_created
ON rescue_idempotency_keys(created_at);

COMMENT ON TABLE rescue_scan_sessions IS 'Rescue Mode scan sessions for progress tracking and resume';
COMMENT ON TABLE rescue_idempotency_keys IS 'Idempotency keys for Rescue Mode write operations';
