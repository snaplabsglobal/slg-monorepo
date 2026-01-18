-- 1. Add Expense Types
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS "expense_type" text DEFAULT 'card';

-- Add Constraint (Optional validation, but good to have)
ALTER TABLE "public"."transactions"
ADD CONSTRAINT "check_expense_type" 
CHECK (expense_type IN ('card', 'cash', 'internal_stock', 'invoice'));

-- 2. Suggest Price Function
-- Uses fuzzy searching (or simple ILIKE) on description/merchant to find past prices.
-- Note: Requires `pg_trgm` extension for best fuzzy search, but ILIKE works for MVP.
-- We will assume `transactions` OR `receipt_items` (if exists) hold the item data.
-- For this MVP, let's assume we look at `transactions.description`.

CREATE OR REPLACE FUNCTION public.fn_suggest_stock_price(search_term text)
RETURNS numeric AS $$
DECLARE
    avg_price numeric;
BEGIN
    SELECT AVG(total_amount) INTO avg_price
    FROM transactions
    WHERE description ILIKE '%' || search_term || '%'
      AND expense_type IN ('card', 'invoice') -- Only look at real purchases
      AND total_amount > 0
    ORDER BY transaction_date DESC
    LIMIT 5;

    RETURN COALESCE(avg_price, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
