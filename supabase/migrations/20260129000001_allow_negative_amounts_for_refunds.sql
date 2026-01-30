-- ============================================
-- Allow negative amounts for refunds/returns
-- ============================================
-- Business requirement: Refunds and returns need negative amounts
-- This migration removes the non-negative constraint to support refunds
-- ============================================

-- Drop the old constraints
ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_non_negative_amount;

ALTER TABLE transactions 
  DROP CONSTRAINT IF EXISTS transactions_non_negative_tax;

-- Add new constraints that allow negative amounts (for refunds/returns)
-- We still want to prevent NULL amounts, but allow negative for refunds
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_amount_not_null 
  CHECK (total_amount IS NOT NULL);

-- Note: tax_amount can be NULL or any numeric value (including negative for tax refunds)
-- No additional constraint needed - the column definition already allows NULL

-- Note: We're removing the >= 0 checks to allow negative amounts
-- Negative amounts represent refunds/returns/credits
-- Positive amounts represent normal expenses/income
-- Negative tax amounts represent tax refunds

COMMENT ON CONSTRAINT transactions_amount_not_null ON transactions IS 
  'Allows negative amounts for refunds, returns, and credits. Positive amounts are normal transactions.';

-- tax_amount can be negative for tax refunds (no constraint needed)
