-- Elegant User-Driven ML (ELEGANT_USER_DRIVEN_ML.md)
-- 1. Location context (地域上下文)
-- 2. Generic vendor_patterns for ALL fields (全字段监控)
-- 3. Auto-activate at 10 corrections (已有); aggregate every correction type

BEGIN;

-- ============================================
-- 1. Add location_region to ml_training_data
-- ============================================
ALTER TABLE "public"."ml_training_data"
  ADD COLUMN IF NOT EXISTS "location_region" TEXT;

COMMENT ON COLUMN "public"."ml_training_data"."location_region" IS 'Optional region/timezone for context (e.g. America/Vancouver)';

-- ============================================
-- 2. Add location_region to vendor_date_patterns
-- ============================================
ALTER TABLE "public"."vendor_date_patterns"
  ADD COLUMN IF NOT EXISTS "location_region" TEXT;

COMMENT ON COLUMN "public"."vendor_date_patterns"."location_region" IS 'Optional region where pattern was learned';

-- ============================================
-- 3. Generic vendor_patterns (all fields: vendor_name, category_user, etc.)
-- ============================================
CREATE TABLE IF NOT EXISTS "public"."vendor_patterns" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "vendor_name" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "pattern_value" JSONB,
    "correction_count" INTEGER NOT NULL DEFAULT 0,
    "location_region" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "last_updated" TIMESTAMPTZ DEFAULT now(),
    "created_at" TIMESTAMPTZ DEFAULT now(),
    UNIQUE("organization_id", "vendor_name", "field_name")
);

COMMENT ON TABLE "public"."vendor_patterns" IS 'Learned patterns per vendor per field (from user corrections); 10+ corrections = is_active';

CREATE INDEX IF NOT EXISTS "idx_vendor_patterns_org"
    ON "public"."vendor_patterns"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_vendor_patterns_vendor_field"
    ON "public"."vendor_patterns"("organization_id", "vendor_name", "field_name");

-- RLS
ALTER TABLE "public"."vendor_patterns" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vendor_patterns"
    ON "public"."vendor_patterns" FOR SELECT
    USING ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can insert vendor_patterns"
    ON "public"."vendor_patterns" FOR INSERT
    WITH CHECK ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can update vendor_patterns"
    ON "public"."vendor_patterns" FOR UPDATE
    USING ("public"."is_org_member"("organization_id"));

-- ============================================
-- 4. Extend record_ml_correction: location_region + all-field aggregation
-- ============================================
-- Drop old 5-parameter overload so the name is unique (PostgreSQL requires this when changing signature)
DROP FUNCTION IF EXISTS "public"."record_ml_correction"(UUID, JSONB, JSONB, TEXT[], TEXT);

CREATE OR REPLACE FUNCTION "public"."record_ml_correction"(
    p_transaction_id UUID,
    p_original_extraction JSONB,
    p_corrected_data JSONB,
    p_correction_fields TEXT[],
    p_correction_reason TEXT DEFAULT NULL,
    p_location_region TEXT DEFAULT NULL
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
    v_corrected_vendor TEXT;
    f TEXT;
    v_pattern_value JSONB;
BEGIN
    SELECT organization_id, vendor_name INTO v_org_id, v_vendor_name
    FROM "public"."transactions"
    WHERE id = p_transaction_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    v_user_id := auth.uid();
    v_vendor_name := UPPER(TRIM(COALESCE(v_vendor_name, '')));
    v_corrected_vendor := UPPER(TRIM(COALESCE((p_corrected_data->>'vendor_name'), v_vendor_name, '')));

    INSERT INTO "public"."ml_training_data" (
        organization_id,
        transaction_id,
        original_extraction,
        corrected_data,
        correction_fields,
        corrected_by,
        correction_reason,
        location_region,
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
        p_location_region,
        true,
        'pending'
    )
    RETURNING id INTO v_correction_id;

    -- Date: upsert vendor_date_patterns (existing logic + location_region)
    IF 'transaction_date' = ANY(p_correction_fields) AND v_vendor_name <> '' THEN
        INSERT INTO "public"."vendor_date_patterns" (
            organization_id,
            vendor_name,
            correction_count,
            is_default_rule,
            location_region,
            last_updated
        ) VALUES (
            v_org_id,
            v_vendor_name,
            1,
            false,
            p_location_region,
            now()
        )
        ON CONFLICT ("organization_id", "vendor_name")
        DO UPDATE SET
            correction_count = "public"."vendor_date_patterns".correction_count + 1,
            last_updated = now(),
            location_region = COALESCE(EXCLUDED.location_region, "public"."vendor_date_patterns".location_region),
            is_default_rule = ("public"."vendor_date_patterns".correction_count + 1) >= 10;
    END IF;

    -- All other fields: upsert vendor_patterns (vendor_name, category_user, total_amount, ...)
    FOREACH f IN ARRAY p_correction_fields
    LOOP
        IF f = 'transaction_date' THEN
            CONTINUE;
        END IF;

        IF v_vendor_name = '' THEN
            CONTINUE;
        END IF;

        v_pattern_value := p_corrected_data->f;
        IF v_pattern_value = 'null'::jsonb THEN
            v_pattern_value := NULL;
        END IF;

        INSERT INTO "public"."vendor_patterns" (
            organization_id,
            vendor_name,
            field_name,
            pattern_value,
            correction_count,
            location_region,
            is_active,
            last_updated
        ) VALUES (
            v_org_id,
            v_vendor_name,
            f,
            v_pattern_value,
            1,
            p_location_region,
            false,
            now()
        )
        ON CONFLICT ("organization_id", "vendor_name", "field_name")
        DO UPDATE SET
            pattern_value = COALESCE(EXCLUDED.pattern_value, "public"."vendor_patterns".pattern_value),
            correction_count = "public"."vendor_patterns".correction_count + 1,
            last_updated = now(),
            location_region = COALESCE(EXCLUDED.location_region, "public"."vendor_patterns".location_region),
            is_active = ("public"."vendor_patterns".correction_count + 1) >= 10;
    END LOOP;

    RETURN v_correction_id;
END;
$$;

COMMENT ON FUNCTION "public"."record_ml_correction"(UUID, JSONB, JSONB, TEXT[], TEXT, TEXT) IS 'Records user correction (all fields), upserts vendor_date_patterns for date and vendor_patterns for other fields; 10+ corrections = active rule';

COMMIT;
