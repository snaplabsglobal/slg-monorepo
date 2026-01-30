-- ============================================================================
-- TEMPORARY: Disable RLS for Core Tables
-- ============================================================================
-- WARNING: This is a TEMPORARY solution to fix RLS policy issues.
-- 
-- This migration disables Row Level Security for:
-- - organizations
-- - organization_members  
-- - transactions
-- - transaction_items
--
-- ⚠️ SECURITY NOTE: Disabling RLS removes data isolation protection.
-- This should only be used temporarily while fixing RLS policies or
-- ensuring RPC functions work correctly.
--
-- TODO: Re-enable RLS with proper policies after fixing the root cause.
-- ============================================================================

-- Disable RLS for core tables
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['organizations', 'organization_members', 'transactions', 'transaction_items'];
  v_table TEXT;
  v_rls_enabled BOOLEAN;
BEGIN
  RAISE NOTICE '=================================';
  RAISE NOTICE 'RLS Status Check:';
  RAISE NOTICE '=================================';
  
  FOREACH v_table IN ARRAY v_tables
  LOOP
    SELECT rowsecurity INTO v_rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = v_table;
    
    IF v_rls_enabled THEN
      RAISE NOTICE '⚠️  %: RLS ENABLED (should be disabled)', v_table;
    ELSE
      RAISE NOTICE '✅ %: RLS DISABLED', v_table;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=================================';
END $$;

-- Verification query (for manual check in SQL Editor)
-- SELECT tablename, rowsecurity as rls_enabled 
-- FROM pg_tables 
-- WHERE schemaname = 'public'
-- AND tablename IN ('organizations', 'organization_members', 'transactions', 'transaction_items')
-- ORDER BY tablename;
