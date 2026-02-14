-- Rescue Mode v1 文件级落点: 规范化表结构
-- 替换 JSONB clusters 为独立的 rescue_clusters / rescue_unknown 表

-- ============================================================
-- 1. rescue_scans 表 (会话表, 重命名自 rescue_scan_sessions)
-- ============================================================

-- 如果旧表存在，先迁移数据
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_scan_sessions') THEN
    -- 创建新表
    CREATE TABLE IF NOT EXISTS rescue_scans (
      id TEXT PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      created_by UUID NOT NULL,
      scope_mode TEXT NOT NULL DEFAULT 'unassigned',
      stats_json JSONB NOT NULL DEFAULT '{}',
      date_range_min TIMESTAMPTZ,
      date_range_max TIMESTAMPTZ,
      date_range_basis TEXT DEFAULT 'taken_at',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'applied', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
    );

    -- 迁移数据
    INSERT INTO rescue_scans (id, organization_id, created_by, scope_mode, stats_json, date_range_min, date_range_max, status, created_at, updated_at, applied_at)
    SELECT
      id,
      organization_id,
      user_id as created_by,
      scope_mode,
      stats as stats_json,
      (date_range->>'min')::timestamptz as date_range_min,
      (date_range->>'max')::timestamptz as date_range_max,
      status,
      created_at,
      updated_at,
      applied_at
    FROM rescue_scan_sessions
    ON CONFLICT (id) DO NOTHING;
  ELSE
    -- 直接创建新表
    CREATE TABLE IF NOT EXISTS rescue_scans (
      id TEXT PRIMARY KEY,
      organization_id UUID NOT NULL REFERENCES organizations(id),
      created_by UUID NOT NULL,
      scope_mode TEXT NOT NULL DEFAULT 'unassigned',
      stats_json JSONB NOT NULL DEFAULT '{}',
      date_range_min TIMESTAMPTZ,
      date_range_max TIMESTAMPTZ,
      date_range_basis TEXT DEFAULT 'taken_at',
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'applied', 'expired')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
    );
  END IF;
END $$;

-- 索引
CREATE INDEX IF NOT EXISTS idx_rescue_scans_org_user
ON rescue_scans(organization_id, created_by, status);

CREATE INDEX IF NOT EXISTS idx_rescue_scans_expires
ON rescue_scans(expires_at) WHERE status = 'active';

-- ============================================================
-- 2. rescue_clusters 表 (独立的聚类表)
-- ============================================================

CREATE TABLE IF NOT EXISTS rescue_clusters (
  id TEXT PRIMARY KEY,  -- cluster_id: 'cl_{geohash}_{index}'
  scan_id TEXT NOT NULL REFERENCES rescue_scans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 照片列表
  photo_ids UUID[] NOT NULL DEFAULT '{}',
  photo_count INTEGER NOT NULL DEFAULT 0,

  -- 地理信息
  centroid_lat DOUBLE PRECISION,
  centroid_lng DOUBLE PRECISION,
  centroid_accuracy_m DOUBLE PRECISION,
  geohash TEXT,

  -- 地址 (reverse geocode 结果)
  address_display TEXT,
  address_source TEXT,
  address_confidence DOUBLE PRECISION,

  -- 时间范围
  time_min TIMESTAMPTZ,
  time_max TIMESTAMPTZ,

  -- 状态
  status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (status IN ('unreviewed', 'confirmed', 'skipped')),
  job_id UUID REFERENCES jobs(id),  -- confirmed 后写入

  -- 审计
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rescue_clusters_scan
ON rescue_clusters(scan_id, status);

CREATE INDEX IF NOT EXISTS idx_rescue_clusters_org
ON rescue_clusters(organization_id);

-- 迁移旧 clusters 数据 (如果存在)
DO $$
DECLARE
  rec RECORD;
  cluster_data JSONB;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_scan_sessions') THEN
    FOR rec IN SELECT id, organization_id, clusters, clusters_confirmed, clusters_skipped FROM rescue_scan_sessions WHERE clusters IS NOT NULL
    LOOP
      FOR cluster_data IN SELECT * FROM jsonb_array_elements(rec.clusters)
      LOOP
        INSERT INTO rescue_clusters (
          id, scan_id, organization_id,
          photo_ids, photo_count,
          centroid_lat, centroid_lng, centroid_accuracy_m, geohash,
          time_min, time_max,
          status
        ) VALUES (
          cluster_data->>'cluster_id',
          rec.id,
          rec.organization_id,
          ARRAY(SELECT jsonb_array_elements_text(cluster_data->'photo_ids'))::UUID[],
          (cluster_data->>'photo_count')::INTEGER,
          (cluster_data->'centroid'->>'lat')::DOUBLE PRECISION,
          (cluster_data->'centroid'->>'lng')::DOUBLE PRECISION,
          (cluster_data->'centroid'->>'accuracy_m')::DOUBLE PRECISION,
          cluster_data->>'geohash',
          (cluster_data->'time_range'->>'min')::TIMESTAMPTZ,
          (cluster_data->'time_range'->>'max')::TIMESTAMPTZ,
          CASE
            WHEN (cluster_data->>'cluster_id') = ANY(rec.clusters_confirmed) THEN 'confirmed'
            WHEN (cluster_data->>'cluster_id') = ANY(rec.clusters_skipped) THEN 'skipped'
            ELSE 'unreviewed'
          END
        ) ON CONFLICT (id) DO NOTHING;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 3. rescue_unknown 表 (无 GPS 照片)
-- ============================================================

CREATE TABLE IF NOT EXISTS rescue_unknown (
  scan_id TEXT NOT NULL REFERENCES rescue_scans(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- 照片列表
  photo_ids UUID[] NOT NULL DEFAULT '{}',
  photo_count INTEGER NOT NULL DEFAULT 0,

  -- 状态跟踪 (按 photo 维度直接看 job_photos.rescue_status 更准确)
  -- 这里存原始快照
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (scan_id)
);

-- 迁移旧 unknown 数据
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_scan_sessions') THEN
    INSERT INTO rescue_unknown (scan_id, organization_id, photo_ids, photo_count)
    SELECT
      id,
      organization_id,
      unknown_photo_ids::UUID[],
      array_length(unknown_photo_ids, 1)
    FROM rescue_scan_sessions
    WHERE unknown_photo_ids IS NOT NULL AND array_length(unknown_photo_ids, 1) > 0
    ON CONFLICT (scan_id) DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 4. idempotency_keys 表 (改进)
-- ============================================================

-- 如果旧表存在，迁移
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_idempotency_keys') THEN
    -- 创建新表结构
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      organization_id UUID NOT NULL REFERENCES organizations(id),
      key TEXT NOT NULL,
      route TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      PRIMARY KEY (organization_id, key, route)
    );

    -- 迁移数据
    INSERT INTO idempotency_keys (organization_id, key, route, request_hash, response_json, created_at)
    SELECT
      organization_id,
      key,
      endpoint as route,
      request_hash,
      response as response_json,
      created_at
    FROM rescue_idempotency_keys
    ON CONFLICT (organization_id, key, route) DO NOTHING;
  ELSE
    CREATE TABLE IF NOT EXISTS idempotency_keys (
      organization_id UUID NOT NULL REFERENCES organizations(id),
      key TEXT NOT NULL,
      route TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      response_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

      PRIMARY KEY (organization_id, key, route)
    );
  END IF;
END $$;

-- 自动过期索引 (7天)
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires
ON idempotency_keys(created_at);

-- ============================================================
-- 注释
-- ============================================================

COMMENT ON TABLE rescue_scans IS 'Rescue Mode 扫描会话 (v1规范化)';
COMMENT ON TABLE rescue_clusters IS 'Rescue Mode 聚类结果，每个 cluster 独立行';
COMMENT ON TABLE rescue_unknown IS 'Rescue Mode 无 GPS 照片快照';
COMMENT ON TABLE idempotency_keys IS '幂等键表，防止重复创建 job / 重复写入';

COMMENT ON COLUMN rescue_clusters.status IS 'unreviewed: 待处理, confirmed: 已确认为 Job, skipped: 已跳过';
COMMENT ON COLUMN rescue_clusters.job_id IS 'confirmed 后写入的 job_id';
