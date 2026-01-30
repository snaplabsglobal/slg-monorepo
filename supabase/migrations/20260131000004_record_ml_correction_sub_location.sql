-- record_ml_correction: write sub_location to vendor_patterns when corrected_data has sub_location
-- Requires: vendor_patterns.sub_location column (from 20260131000003)

BEGIN;

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
    f TEXT;
    v_pattern_value JSONB;
    v_sub_location TEXT;
BEGIN
    SELECT organization_id, vendor_name INTO v_org_id, v_vendor_name
    FROM "public"."transactions"
    WHERE id = p_transaction_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    v_user_id := auth.uid();
    v_vendor_name := UPPER(TRIM(COALESCE(v_vendor_name, '')));
    v_sub_location := NULLIF(TRIM(p_corrected_data->>'sub_location'), '');

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

    FOREACH f IN ARRAY p_correction_fields
    LOOP
        IF f = 'transaction_date' OR v_vendor_name = '' THEN
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
            sub_location,
            is_active,
            last_updated
        ) VALUES (
            v_org_id,
            v_vendor_name,
            f,
            v_pattern_value,
            1,
            p_location_region,
            v_sub_location,
            false,
            now()
        )
        ON CONFLICT ("organization_id", "vendor_name", "field_name")
        DO UPDATE SET
            pattern_value = COALESCE(EXCLUDED.pattern_value, "public"."vendor_patterns".pattern_value),
            correction_count = "public"."vendor_patterns".correction_count + 1,
            last_updated = now(),
            location_region = COALESCE(EXCLUDED.location_region, "public"."vendor_patterns".location_region),
            sub_location = COALESCE(EXCLUDED.sub_location, "public"."vendor_patterns".sub_location),
            is_active = ("public"."vendor_patterns".correction_count + 1) >= 10;
    END LOOP;

    RETURN v_correction_id;
END;
$$;

COMMENT ON FUNCTION "public"."record_ml_correction"(UUID, JSONB, JSONB, TEXT[], TEXT, TEXT) IS 'Records user correction (all fields), upserts vendor_date_patterns and vendor_patterns; writes sub_location when present; 10+ = active rule';

COMMIT;
