-- Production ML: vendor date patterns + preset rules (per PRODUCTION_ML_SYSTEM.md)
-- Stop localStorage; persist to DB for global learning.

BEGIN;

-- ============================================
-- 1. Vendor date patterns (org-scoped, learned from corrections)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."vendor_date_patterns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "vendor_name" TEXT NOT NULL,
    "date_format" VARCHAR(20),
    "year_century" VARCHAR(4),
    "correction_count" INTEGER NOT NULL DEFAULT 0,
    "is_default_rule" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMPTZ DEFAULT now(),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("organization_id", "vendor_name")
);

COMMENT ON TABLE "public"."vendor_date_patterns" IS 'Learned date format patterns per vendor (from user corrections); 10+ corrections auto-upgrade to default rule';

CREATE INDEX IF NOT EXISTS "idx_vendor_date_patterns_org"
    ON "public"."vendor_date_patterns"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_vendor_date_patterns_vendor"
    ON "public"."vendor_date_patterns"("organization_id", "vendor_name");

-- ============================================
-- 2. Vendor preset rules (global, Vancouver 护城河)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."vendor_preset_rules" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "vendor_name" TEXT NOT NULL UNIQUE,
    "date_format" VARCHAR(20) NOT NULL,
    "year_century" VARCHAR(4) NOT NULL DEFAULT '20',
    "created_at" TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE "public"."vendor_preset_rules" IS 'Global preset date rules for known vendors (e.g. Vancouver local)';

CREATE INDEX IF NOT EXISTS "idx_vendor_preset_rules_name"
    ON "public"."vendor_preset_rules"("vendor_name");

-- Vancouver presets (normalized vendor name for matching)
INSERT INTO "public"."vendor_preset_rules" ("vendor_name", "date_format", "year_century")
VALUES
    ('THE HOME DEPOT', 'DD/MM/YY', '20'),
    ('RONA', 'DD/MM/YY', '20'),
    ('CANADIAN TIRE', 'DD/MM/YY', '20'),
    ('CLOVERDALE PAINT', 'MM/DD/YY', '20'),
    ('COSTCO', 'MM/DD/YY', '20')
ON CONFLICT ("vendor_name") DO NOTHING;

-- ============================================
-- 3. RLS
-- ============================================
ALTER TABLE "public"."vendor_date_patterns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_preset_rules" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor_date_patterns"
    ON "public"."vendor_date_patterns" FOR SELECT
    USING ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can insert vendor_date_patterns"
    ON "public"."vendor_date_patterns" FOR INSERT
    WITH CHECK ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can update vendor_date_patterns"
    ON "public"."vendor_date_patterns" FOR UPDATE
    USING ("public"."is_org_member"("organization_id"));

-- Preset rules: read-only for all authenticated (no org)
CREATE POLICY "Authenticated can view vendor_preset_rules"
    ON "public"."vendor_preset_rules" FOR SELECT
    TO authenticated
    USING (true);

-- ============================================
-- 4. Extend record_ml_correction: upsert vendor_date_patterns on date correction
-- ============================================
CREATE OR REPLACE FUNCTION "public"."record_ml_correction"(
    p_transaction_id UUID,
    p_original_extraction JSONB,
    p_corrected_data JSONB,
    p_correction_fields TEXT[],
    p_correction_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id UUID;
    v_user_id UUID;
    v_correction_id UUID;
    v_vendor_name TEXT;
BEGIN
    SELECT organization_id INTO v_org_id
    FROM "public"."transactions"
    WHERE id = p_transaction_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    v_user_id := auth.uid();

    INSERT INTO "public"."ml_training_data" (
        organization_id,
        transaction_id,
        original_extraction,
        corrected_data,
        correction_fields,
        corrected_by,
        correction_reason,
        is_training_ready,
        training_status
    ) VALUES (
        v_org_id,
        p_transaction_id,
        p_original_extraction,
        p_corrected_data,
        p_correction_fields,
        v_user_id,
        p_correction_reason,
        true,
        'pending'
    )
    RETURNING id INTO v_correction_id;

    -- Production ML: upsert vendor_date_patterns when transaction_date was corrected
    IF 'transaction_date' = ANY(p_correction_fields) THEN
        SELECT vendor_name INTO v_vendor_name
        FROM "public"."transactions"
        WHERE id = p_transaction_id;

        v_vendor_name := UPPER(TRIM(COALESCE(v_vendor_name, '')));
        IF v_vendor_name <> '' THEN
            INSERT INTO "public"."vendor_date_patterns" (
                organization_id,
                vendor_name,
                correction_count,
                is_default_rule,
                last_updated
            ) VALUES (
                v_org_id,
                v_vendor_name,
                1,
                false,
                now()
            )
            ON CONFLICT ("organization_id", "vendor_name")
            DO UPDATE SET
                correction_count = "public"."vendor_date_patterns".correction_count + 1,
                last_updated = now(),
                is_default_rule = ("public"."vendor_date_patterns".correction_count + 1) >= 10;
        END IF;
    END IF;

    RETURN v_correction_id;
END;
$$;

COMMENT ON FUNCTION "public"."record_ml_correction" IS 'Records user correction for ML training and upserts vendor_date_patterns (10+ corrections = default rule)';

COMMIT;
