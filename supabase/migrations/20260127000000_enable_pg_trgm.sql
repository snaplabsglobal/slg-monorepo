-- Migration: Enable pg_trgm Extension for Fuzzy Matching
-- Timestamp: 20260127000000
-- Purpose: Enable pg_trgm extension for vendor name fuzzy matching in ML system
-- Dependencies: None
-- Related: ML Training System, Vendor Standardization

BEGIN;

-- ============================================
-- Enable pg_trgm Extension
-- ============================================
-- pg_trgm provides functions for determining similarity of text based on trigram matching
-- Used by get_vendor_standardization_suggestion() for fuzzy vendor name matching

CREATE EXTENSION IF NOT EXISTS pg_trgm;

COMMENT ON EXTENSION pg_trgm IS 'Text similarity measurement and index searching based on trigrams - used for vendor name fuzzy matching';

-- ============================================
-- Verify Extension Installation
-- ============================================
DO $$
DECLARE
    v_extension_exists BOOLEAN;
    v_similarity_test NUMERIC;
BEGIN
    -- Check if extension was successfully installed
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
    ) INTO v_extension_exists;
    
    IF NOT v_extension_exists THEN
        RAISE EXCEPTION 'pg_trgm extension failed to install';
    END IF;
    
    -- Test similarity function
    SELECT similarity('HOME DEPOT', 'Home Depot') INTO v_similarity_test;
    
    IF v_similarity_test IS NULL THEN
        RAISE EXCEPTION 'similarity() function not working';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'pg_trgm Extension Successfully Enabled';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Extension: pg_trgm - OK';
    RAISE NOTICE 'Similarity Function: Working - OK';
    RAISE NOTICE 'Test Similarity Score: %', v_similarity_test;
    RAISE NOTICE '';
    RAISE NOTICE 'Available Functions:';
    RAISE NOTICE '  - similarity(text, text) -> float';
    RAISE NOTICE '  - show_trgm(text) -> text[]';
    RAISE NOTICE '  - word_similarity(text, text) -> float';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Operators:';
    RAISE NOTICE '  - %% (similar to)';
    RAISE NOTICE '  - <-> (distance)';
    RAISE NOTICE '';
    RAISE NOTICE 'ML Vendor Standardization: Ready - OK';
    RAISE NOTICE '========================================';
END $$;

-- ============================================
-- Create Trigram Index on vendor_aliases (Optional - Performance Optimization)
-- ============================================
-- This index improves performance of fuzzy matching queries
-- Uncomment if vendor_aliases table has many records (>1000)

-- CREATE INDEX IF NOT EXISTS idx_vendor_aliases_alias_trgm 
--     ON vendor_aliases USING gin (alias gin_trgm_ops);

-- CREATE INDEX IF NOT EXISTS idx_vendor_aliases_resolved_name_trgm 
--     ON vendor_aliases USING gin (resolved_name gin_trgm_ops);

COMMENT ON EXTENSION pg_trgm IS 'Trigram extension for fuzzy text matching - enables vendor name standardization with similarity scoring';

-- ============================================
-- Usage Examples (for reference)
-- ============================================
/*

-- Example 1: Test similarity between two strings
SELECT similarity('HOME DEPOT', 'Home Depot #1234');
-- Returns: ~0.5 (50% similar)

-- Example 2: Find similar vendor names
SELECT 
    alias,
    resolved_name,
    similarity(alias, 'HOME DEPOT #1234') as score
FROM vendor_aliases
WHERE similarity(alias, 'HOME DEPOT #1234') > 0.3
ORDER BY score DESC;

-- Example 3: Use in vendor standardization
SELECT * FROM get_vendor_standardization_suggestion(
    'org-uuid'::UUID,
    'HOME DEPOT #1234'
);

-- Example 4: Show trigrams for a string
SELECT show_trgm('HOME DEPOT');
-- Returns: {" h"," ho",dep,epo,"ho ",hom,ome,ome,"ot ",pot,"t d"}

-- Example 5: Use % operator for similarity matching
SELECT * FROM vendor_aliases 
WHERE alias % 'HOME DEPOT #1234';

*/

COMMIT;

-- ============================================
-- Post-Migration Verification
-- ============================================
-- Run these queries after migration to verify everything works:

-- Query 1: Check extension is installed
-- SELECT extname, extversion FROM pg_extension WHERE extname = 'pg_trgm';

-- Query 2: Test similarity function
-- SELECT similarity('HOME DEPOT', 'Home Depot #1234') as similarity_score;

-- Query 3: Test vendor standardization with fuzzy matching
-- SELECT * FROM get_vendor_standardization_suggestion(
--     'your-org-uuid'::UUID,
--     'HOME DEPOT #1234'
-- );
