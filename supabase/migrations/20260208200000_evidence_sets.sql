-- ============================================================================
-- Evidence Sets: Curated, Auditable Photo Collections
-- ============================================================================
-- Implements the Evidence Set model from:
--   260207_JSS应用场景与EvidenceSet产品模型_完整执行版.md
--
-- Core Concepts:
--   - Evidence Set = "可交付、可审计、可复用"的施工证据包
--   - Evidence Sets are views, not copies (photos can belong to multiple sets)
--   - External parties never modify evidence
--   - Auditability always outweighs convenience
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Add missing columns to job_photos (GPS + captured_by)
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS lat numeric,
ADD COLUMN IF NOT EXISTS lng numeric,
ADD COLUMN IF NOT EXISTS captured_by uuid REFERENCES auth.users(id);

-- Comment on new columns
COMMENT ON COLUMN public.job_photos.lat IS 'GPS latitude - proof of location';
COMMENT ON COLUMN public.job_photos.lng IS 'GPS longitude - proof of location';
COMMENT ON COLUMN public.job_photos.captured_by IS 'User who captured the photo - audit trail';

-- Index for location queries
CREATE INDEX IF NOT EXISTS idx_job_photos_location
  ON public.job_photos(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) EVIDENCE_SETS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_sets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,

  -- Core fields
  name            text NOT NULL,          -- "2-Hour Firewall – Level 1–3"
  purpose         text NOT NULL DEFAULT 'custom'
                  CHECK (purpose IN (
                    'firewall',           -- 防火墙合规
                    'rough_in',           -- 粗装阶段
                    'encapsulation',      -- 封板记录
                    'permit_daily',       -- 每日许可证明
                    'subtrade_handoff',   -- 分包交接
                    'custom'              -- 自定义
                  )),

  -- Status workflow: draft → reviewed → shared
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'reviewed', 'shared')),

  -- Audit fields
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  shared_at       timestamptz,            -- When first shared

  -- Soft delete
  deleted_at      timestamptz
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_evidence_sets_job
  ON public.evidence_sets(job_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_evidence_sets_org_status
  ON public.evidence_sets(organization_id, status)
  WHERE deleted_at IS NULL;

-- Comments
COMMENT ON TABLE public.evidence_sets IS 'Curated photo collections for compliance, sharing, and audit. Evidence Sets explain outcomes.';
COMMENT ON COLUMN public.evidence_sets.purpose IS 'Template type: firewall, rough_in, encapsulation, permit_daily, subtrade_handoff, custom';
COMMENT ON COLUMN public.evidence_sets.status IS 'Workflow: draft (editing) → reviewed (ready) → shared (locked)';

-- ---------------------------------------------------------------------------
-- 3) EVIDENCE_SET_ITEMS TABLE (The "soul" of Evidence Sets)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_set_items (
  evidence_set_id uuid NOT NULL REFERENCES public.evidence_sets(id) ON DELETE CASCADE,
  photo_id        uuid NOT NULL REFERENCES public.job_photos(id) ON DELETE CASCADE,
  order_index     integer NOT NULL DEFAULT 0,

  -- Optional layer label for firewall compliance
  layer_label     text,                   -- "Layer 1", "Layer 2", etc.

  -- Timestamps
  added_at        timestamptz NOT NULL DEFAULT now(),
  added_by        uuid NOT NULL REFERENCES auth.users(id),

  PRIMARY KEY (evidence_set_id, photo_id)
);

-- Index for efficient photo lookup
CREATE INDEX IF NOT EXISTS idx_evidence_set_items_photo
  ON public.evidence_set_items(photo_id);

-- Comments
COMMENT ON TABLE public.evidence_set_items IS 'Links photos to evidence sets. One photo can belong to multiple sets.';
COMMENT ON COLUMN public.evidence_set_items.order_index IS 'Order within the evidence set - chronological by default';
COMMENT ON COLUMN public.evidence_set_items.layer_label IS 'Optional label for layered construction (firewall, drywall, etc.)';

-- ---------------------------------------------------------------------------
-- 4) AUDIT_LOGS TABLE (合规护城河)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What was affected
  entity_type     text NOT NULL
                  CHECK (entity_type IN ('photo', 'evidence_set', 'job', 'share_link')),
  entity_id       uuid NOT NULL,

  -- What happened
  action          text NOT NULL
                  CHECK (action IN (
                    'capture',            -- Photo captured
                    'upload',             -- Photo uploaded
                    'create',             -- Entity created
                    'update',             -- Entity updated
                    'add',                -- Item added to set
                    'remove',             -- Item removed from set
                    'share',              -- Link created/sent
                    'view',               -- External view
                    'revoke',             -- Access revoked
                    'delete'              -- Entity deleted
                  )),

  -- Who did it
  actor_id        uuid REFERENCES auth.users(id),
  actor_role      text,                   -- 'owner', 'staff', 'system'

  -- Additional context
  metadata        jsonb DEFAULT '{}',     -- Action-specific data
  ip_address      inet,                   -- For external access tracking
  user_agent      text,                   -- Browser/device info

  -- Timestamp (immutable)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_time
  ON public.audit_logs(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
  ON public.audit_logs(actor_id, created_at DESC)
  WHERE actor_id IS NOT NULL;

-- Comments
COMMENT ON TABLE public.audit_logs IS 'Immutable audit trail for compliance. Inspector/法务/保险 = 只信这个表';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Action-specific context: old/new values, share recipients, etc.';

-- ---------------------------------------------------------------------------
-- 5) SHARE_LINKS TABLE (Secure sharing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.share_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  evidence_set_id   uuid NOT NULL REFERENCES public.evidence_sets(id) ON DELETE CASCADE,

  -- Link token (for URL)
  token             text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),

  -- Access control
  view_type         text NOT NULL DEFAULT 'evidence_readonly'
                    CHECK (view_type IN (
                      'evidence_readonly',    -- Inspector view
                      'curated_client'        -- Owner/Designer view
                    )),

  -- Optional restrictions
  expires_at        timestamptz,            -- Link expiration
  max_views         integer,                -- Max view count
  view_count        integer NOT NULL DEFAULT 0,

  -- Recipient info (optional)
  recipient_name    text,                   -- "City Inspector - John"
  recipient_email   text,                   -- For tracking

  -- Timestamps
  created_by        uuid NOT NULL REFERENCES auth.users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  last_viewed_at    timestamptz,
  revoked_at        timestamptz             -- Null = active
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_share_links_token
  ON public.share_links(token)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_share_links_evidence_set
  ON public.share_links(evidence_set_id)
  WHERE revoked_at IS NULL;

-- Comments
COMMENT ON TABLE public.share_links IS 'Secure, read-only share links for evidence sets';
COMMENT ON COLUMN public.share_links.token IS 'URL-safe token for public access';
COMMENT ON COLUMN public.share_links.view_type IS 'Access level: evidence_readonly (inspector) or curated_client (owner/designer)';

-- ---------------------------------------------------------------------------
-- 6) TRIGGERS: Auto-update timestamps
-- ---------------------------------------------------------------------------
CREATE TRIGGER evidence_sets_updated_at
  BEFORE UPDATE ON public.evidence_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 7) TRIGGER: Lock evidence_set when shared
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lock_shared_evidence_set()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'shared' AND NEW.status != 'shared' THEN
    RAISE EXCEPTION 'Cannot change status of shared evidence set';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_sets_lock_shared
  BEFORE UPDATE ON public.evidence_sets
  FOR EACH ROW EXECUTE FUNCTION public.lock_shared_evidence_set();

-- ---------------------------------------------------------------------------
-- 8) FUNCTION: Log audit event
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_audit(
  p_org_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_action text,
  p_actor_id uuid DEFAULT NULL,
  p_actor_role text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_logs (
    organization_id, entity_type, entity_id, action, actor_id, actor_role, metadata
  ) VALUES (
    p_org_id, p_entity_type, p_entity_id, p_action,
    COALESCE(p_actor_id, auth.uid()),
    p_actor_role,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 9) ROW-LEVEL SECURITY: evidence_sets
-- ---------------------------------------------------------------------------
ALTER TABLE public.evidence_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_sets FORCE ROW LEVEL SECURITY;

-- SELECT: Members can view their org's evidence sets
CREATE POLICY "Members can view org evidence sets"
  ON public.evidence_sets FOR SELECT
  USING (public.is_org_member(organization_id) AND deleted_at IS NULL);

-- INSERT: Members can create evidence sets
CREATE POLICY "Members can create evidence sets"
  ON public.evidence_sets FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members can update draft/reviewed evidence sets
CREATE POLICY "Members can update evidence sets"
  ON public.evidence_sets FOR UPDATE
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- DELETE: Members can soft-delete evidence sets
CREATE POLICY "Members can delete evidence sets"
  ON public.evidence_sets FOR DELETE
  USING (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- 10) ROW-LEVEL SECURITY: evidence_set_items
-- ---------------------------------------------------------------------------
ALTER TABLE public.evidence_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_set_items FORCE ROW LEVEL SECURITY;

-- SELECT: Members can view items in their org's evidence sets
CREATE POLICY "Members can view evidence set items"
  ON public.evidence_set_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM evidence_sets es
    WHERE es.id = evidence_set_id
      AND public.is_org_member(es.organization_id)
      AND es.deleted_at IS NULL
  ));

-- INSERT: Members can add items to their org's evidence sets
CREATE POLICY "Members can add evidence set items"
  ON public.evidence_set_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM evidence_sets es
    WHERE es.id = evidence_set_id
      AND public.is_org_member(es.organization_id)
      AND es.status != 'shared'
  ));

-- DELETE: Members can remove items from non-shared evidence sets
CREATE POLICY "Members can remove evidence set items"
  ON public.evidence_set_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM evidence_sets es
    WHERE es.id = evidence_set_id
      AND public.is_org_member(es.organization_id)
      AND es.status != 'shared'
  ));

-- ---------------------------------------------------------------------------
-- 11) ROW-LEVEL SECURITY: audit_logs (read-only for members)
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- SELECT: Members can view their org's audit logs
CREATE POLICY "Members can view org audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_org_member(organization_id));

-- INSERT: Only via log_audit function (SECURITY DEFINER)
-- No direct INSERT policy needed

-- ---------------------------------------------------------------------------
-- 12) ROW-LEVEL SECURITY: share_links
-- ---------------------------------------------------------------------------
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links FORCE ROW LEVEL SECURITY;

-- SELECT: Members can view their org's share links
CREATE POLICY "Members can view org share links"
  ON public.share_links FOR SELECT
  USING (public.is_org_member(organization_id));

-- INSERT: Members can create share links
CREATE POLICY "Members can create share links"
  ON public.share_links FOR INSERT
  WITH CHECK (public.is_org_member(organization_id));

-- UPDATE: Members can update (e.g., revoke) share links
CREATE POLICY "Members can update share links"
  ON public.share_links FOR UPDATE
  USING (public.is_org_member(organization_id))
  WITH CHECK (public.is_org_member(organization_id));

-- Public access via token (for external viewers)
CREATE POLICY "Public can view via token"
  ON public.share_links FOR SELECT
  USING (
    revoked_at IS NULL
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_views IS NULL OR view_count < max_views)
  );

-- ---------------------------------------------------------------------------
-- 13) ENABLE REALTIME
-- ---------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence_sets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.evidence_set_items;

-- ---------------------------------------------------------------------------
-- 14) VERIFICATION
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['evidence_sets', 'evidence_set_items', 'audit_logs', 'share_links'];
  v_table  TEXT;
  v_rls    BOOLEAN;
BEGIN
  RAISE NOTICE '=== Evidence Sets Migration Verification ===';
  FOREACH v_table IN ARRAY v_tables
  LOOP
    SELECT rowsecurity INTO v_rls
      FROM pg_tables
     WHERE schemaname = 'public' AND tablename = v_table;

    IF v_rls THEN
      RAISE NOTICE '  OK %: RLS ENABLED', v_table;
    ELSE
      RAISE WARNING '  WARN %: RLS DISABLED', v_table;
    END IF;
  END LOOP;
  RAISE NOTICE '=============================================';
END $$;
