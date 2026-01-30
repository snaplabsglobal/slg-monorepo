-- ============================================================================
-- Three-layer deletion system (Soft delete + Replace + Export lock/Void)
-- Based on: claude/THREE_LAYER_DELETION_SYSTEM.md
-- ============================================================================

-- Layer 1: Soft delete reason
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS deletion_reason text;

-- Layer 3: Export lock / void audit fields
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS exported_at timestamptz,
  ADD COLUMN IF NOT EXISTS exported_by uuid,
  ADD COLUMN IF NOT EXISTS voided_at timestamptz,
  ADD COLUMN IF NOT EXISTS voided_by uuid,
  ADD COLUMN IF NOT EXISTS void_reason text;

-- Foreign keys follow existing pattern in schema (profiles id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_exported_by_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_exported_by_fkey
      FOREIGN KEY (exported_by) REFERENCES public.profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_voided_by_fkey'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_voided_by_fkey
      FOREIGN KEY (voided_by) REFERENCES public.profiles(id);
  END IF;
END $$;

-- Helpful partial index for active rows (if not already present)
CREATE INDEX IF NOT EXISTS idx_transactions_org_not_deleted
  ON public.transactions(organization_id, transaction_date DESC)
  WHERE deleted_at IS NULL;

