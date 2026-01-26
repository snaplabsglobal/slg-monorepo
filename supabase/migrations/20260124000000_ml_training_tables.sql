-- Migration: Machine Learning Training Tables
-- Timestamp: 20260124000000
-- Purpose: Create tables for ML training data, user corrections, and vendor standardization

BEGIN;

-- ============================================
-- 1. ML Training Data Table
-- ============================================
-- Stores user corrections to train Gemini 2.5 Flash model
CREATE TABLE IF NOT EXISTS "public"."ml_training_data" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "transaction_id" UUID REFERENCES "public"."transactions"("id") ON DELETE SET NULL,
    
    -- Original AI Extraction
    "original_extraction" JSONB NOT NULL, -- Full AI response before correction
    "ai_model_version" TEXT DEFAULT 'gemini-2.5-flash',
    "ai_confidence" NUMERIC(3,2),
    
    -- User Corrections
    "corrected_data" JSONB NOT NULL, -- User's corrected version
    "correction_fields" TEXT[] NOT NULL, -- Array of fields that were corrected: ['vendor_name', 'total_amount', 'line_items']
    
    -- Correction Metadata
    "corrected_by" UUID REFERENCES auth.users("id"),
    "corrected_at" TIMESTAMPTZ DEFAULT now(),
    "correction_reason" TEXT, -- Why user made the correction
    
    -- Training Status
    "is_training_ready" BOOLEAN DEFAULT false, -- Ready to be used for training
    "training_status" TEXT DEFAULT 'pending' CHECK (training_status IN ('pending', 'processed', 'failed')),
    "processed_at" TIMESTAMPTZ,
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE "public"."ml_training_data" IS 'Stores user corrections for ML model training with Gemini 2.5 Flash';

-- ============================================
-- 2. Vendor Standardization Log
-- ============================================
-- Tracks vendor name standardization attempts and results
CREATE TABLE IF NOT EXISTS "public"."vendor_standardization_log" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "transaction_id" UUID REFERENCES "public"."transactions"("id") ON DELETE SET NULL,
    
    -- Vendor Info
    "raw_vendor_name" TEXT NOT NULL, -- Original vendor name from receipt
    "standardized_name" TEXT, -- Standardized name (from vendor_aliases or ML)
    "vendor_alias_id" UUID REFERENCES "public"."vendor_aliases"("id") ON DELETE SET NULL,
    
    -- Standardization Method
    "standardization_method" TEXT NOT NULL CHECK (standardization_method IN ('exact_match', 'fuzzy_match', 'ml_suggestion', 'manual', 'auto_created')),
    "confidence_score" NUMERIC(3,2), -- 0.00 to 1.00
    
    -- ML Suggestion (if used)
    "ml_suggestion" JSONB, -- ML model's suggestion with alternatives
    "ml_model_version" TEXT DEFAULT 'gemini-2.5-flash',
    
    -- User Action
    "user_action" TEXT CHECK (user_action IN ('accepted', 'rejected', 'modified', 'pending')),
    "user_modified_name" TEXT, -- If user modified the standardized name
    "actioned_by" UUID REFERENCES auth.users("id"),
    "actioned_at" TIMESTAMPTZ,
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE "public"."vendor_standardization_log" IS 'Logs vendor name standardization attempts and user feedback for ML training';

-- ============================================
-- 3. ML Model Performance Metrics
-- ============================================
-- Tracks model performance over time
CREATE TABLE IF NOT EXISTS "public"."ml_model_metrics" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "organization_id" UUID REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    
    -- Model Info
    "model_name" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    "model_version" TEXT,
    "metric_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Accuracy Metrics
    "total_extractions" INTEGER DEFAULT 0,
    "corrections_count" INTEGER DEFAULT 0,
    "accuracy_rate" NUMERIC(5,2), -- Percentage: 0.00 to 100.00
    
    -- Field-level Accuracy
    "field_accuracy" JSONB DEFAULT '{}'::jsonb, -- {"vendor_name": 0.95, "total_amount": 0.98, ...}
    
    -- Vendor Standardization Metrics
    "vendor_standardizations" INTEGER DEFAULT 0,
    "vendor_auto_accept_rate" NUMERIC(5,2), -- Percentage of auto-accepted standardizations
    
    -- Performance Metrics
    "avg_processing_time_ms" INTEGER, -- Average processing time in milliseconds
    "avg_confidence_score" NUMERIC(3,2),
    
    -- Metadata
    "metadata" JSONB DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMPTZ DEFAULT now(),
    "updated_at" TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(organization_id, model_name, metric_date)
);

COMMENT ON TABLE "public"."ml_model_metrics" IS 'Tracks ML model performance metrics for monitoring and improvement';

-- ============================================
-- 4. Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS "idx_ml_training_data_org" 
    ON "public"."ml_training_data"("organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_ml_training_data_transaction" 
    ON "public"."ml_training_data"("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_ml_training_data_status" 
    ON "public"."ml_training_data"("training_status", "is_training_ready") 
    WHERE "is_training_ready" = true;

CREATE INDEX IF NOT EXISTS "idx_vendor_std_log_org" 
    ON "public"."vendor_standardization_log"("organization_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "idx_vendor_std_log_raw_name" 
    ON "public"."vendor_standardization_log"("organization_id", "raw_vendor_name");

CREATE INDEX IF NOT EXISTS "idx_vendor_std_log_action" 
    ON "public"."vendor_standardization_log"("user_action") 
    WHERE "user_action" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_ml_metrics_org_date" 
    ON "public"."ml_model_metrics"("organization_id", "metric_date" DESC);

-- ============================================
-- 5. RLS Policies
-- ============================================
ALTER TABLE "public"."ml_training_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."vendor_standardization_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ml_model_metrics" ENABLE ROW LEVEL SECURITY;

-- ML Training Data: Users can view/manage their org's data
CREATE POLICY "Users can view ml training data" 
    ON "public"."ml_training_data" FOR SELECT 
    USING ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can insert ml training data" 
    ON "public"."ml_training_data" FOR INSERT 
    WITH CHECK ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can update ml training data" 
    ON "public"."ml_training_data" FOR UPDATE 
    USING ("public"."is_org_member"("organization_id"));

-- Vendor Standardization Log: Users can view/manage their org's logs
CREATE POLICY "Users can view vendor std logs" 
    ON "public"."vendor_standardization_log" FOR SELECT 
    USING ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can insert vendor std logs" 
    ON "public"."vendor_standardization_log" FOR INSERT 
    WITH CHECK ("public"."is_org_member"("organization_id"));

CREATE POLICY "Users can update vendor std logs" 
    ON "public"."vendor_standardization_log" FOR UPDATE 
    USING ("public"."is_org_member"("organization_id"));

-- ML Metrics: Users can view their org's metrics
CREATE POLICY "Users can view ml metrics" 
    ON "public"."ml_model_metrics" FOR SELECT 
    USING ("public"."is_org_member"("organization_id") OR "organization_id" IS NULL);

CREATE POLICY "Admins can manage ml metrics" 
    ON "public"."ml_model_metrics" FOR ALL 
    USING ("public"."is_org_admin"("organization_id"));

-- ============================================
-- 6. Helper Functions
-- ============================================

-- Function: Record user correction
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
BEGIN
    -- Get organization_id from transaction
    SELECT organization_id INTO v_org_id
    FROM "public"."transactions"
    WHERE id = p_transaction_id;
    
    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;
    
    -- Get current user
    v_user_id := auth.uid();
    
    -- Insert correction record
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
        true, -- Mark as ready for training
        'pending'
    )
    RETURNING id INTO v_correction_id;
    
    RETURN v_correction_id;
END;
$$;

COMMENT ON FUNCTION "public"."record_ml_correction" IS 'Records a user correction for ML training';

-- Function: Get vendor standardization suggestion using ML
CREATE OR REPLACE FUNCTION "public"."get_vendor_standardization_suggestion"(
    p_organization_id UUID,
    p_raw_vendor_name TEXT
)
RETURNS TABLE (
    standardized_name TEXT,
    confidence_score NUMERIC,
    method TEXT,
    vendor_alias_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exact_match RECORD;
    v_fuzzy_match RECORD;
BEGIN
    -- 1. Try exact match (case-insensitive)
    SELECT resolved_name, id
    INTO v_exact_match
    FROM "public"."vendor_aliases"
    WHERE organization_id = p_organization_id
        AND LOWER(alias) = LOWER(p_raw_vendor_name)
    LIMIT 1;
    
    IF v_exact_match.id IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_exact_match.resolved_name,
            1.00::NUMERIC,
            'exact_match'::TEXT,
            v_exact_match.id;
        RETURN;
    END IF;
    
    -- 2. Try fuzzy match (similarity > 0.8)
    -- Using pg_trgm extension if available, otherwise simple LIKE
    SELECT resolved_name, id, 
        similarity(LOWER(alias), LOWER(p_raw_vendor_name)) as sim_score
    INTO v_fuzzy_match
    FROM "public"."vendor_aliases"
    WHERE organization_id = p_organization_id
        AND similarity(LOWER(alias), LOWER(p_raw_vendor_name)) > 0.8
    ORDER BY sim_score DESC
    LIMIT 1;
    
    IF v_fuzzy_match.id IS NOT NULL THEN
        RETURN QUERY SELECT 
            v_fuzzy_match.resolved_name,
            v_fuzzy_match.sim_score,
            'fuzzy_match'::TEXT,
            v_fuzzy_match.id;
        RETURN;
    END IF;
    
    -- 3. No match found - return NULL (ML suggestion should be handled in application layer)
    RETURN QUERY SELECT 
        NULL::TEXT,
        0.00::NUMERIC,
        'ml_suggestion'::TEXT,
        NULL::UUID;
END;
$$;

COMMENT ON FUNCTION "public"."get_vendor_standardization_suggestion" IS 'Gets vendor standardization suggestion using exact/fuzzy matching';

-- ============================================
-- 7. Update Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER "update_ml_training_data_updated_at"
    BEFORE UPDATE ON "public"."ml_training_data"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE TRIGGER "update_ml_model_metrics_updated_at"
    BEFORE UPDATE ON "public"."ml_model_metrics"
    FOR EACH ROW
    EXECUTE FUNCTION "public"."update_updated_at_column"();

COMMIT;
