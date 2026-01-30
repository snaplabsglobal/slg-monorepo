-- ============================================================================
-- Three-Layer Duplicate Prevention System
-- Based on COO's requirements: Image Hash + Client ID + Fuzzy Matching
-- ============================================================================

-- Layer 1: Image Hash (Physical Deduplication)
-- Add UNIQUE constraint on image_hash to prevent duplicate images
DO $$
BEGIN
  -- Check if unique index already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_transactions_image_hash_unique'
  ) THEN
    -- Create unique index on image_hash (only for non-null values)
    CREATE UNIQUE INDEX idx_transactions_image_hash_unique 
    ON public.transactions(image_hash) 
    WHERE image_hash IS NOT NULL;
    
    COMMENT ON INDEX idx_transactions_image_hash_unique IS 
    'Prevents duplicate receipts with identical image hash (Layer 1: Physical Deduplication)';
  END IF;
END $$;

-- Layer 2: Client ID (Idempotency)
-- Add client_id column for idempotent requests
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS client_id TEXT;

-- Create unique index on client_id (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_client_id_unique 
ON public.transactions(client_id) 
WHERE client_id IS NOT NULL;

COMMENT ON COLUMN public.transactions.client_id IS 
'Client-generated UUID for idempotent upload requests (Layer 2: Logical Deduplication)';

-- Layer 3: Fuzzy Matching Helper Index
-- Create composite index for fast duplicate detection (amount + date + vendor)
CREATE INDEX IF NOT EXISTS idx_transactions_fuzzy_match 
ON public.transactions(organization_id, transaction_date, total_amount, vendor_name)
WHERE deleted_at IS NULL;

COMMENT ON INDEX idx_transactions_fuzzy_match IS 
'Fast lookup for potential duplicate receipts (Layer 3: Business Deduplication)';

-- Add flag for suspected duplicates
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS is_suspected_duplicate BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.transactions.is_suspected_duplicate IS 
'Flag indicating this transaction may be a duplicate (requires user review)';
