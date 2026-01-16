-- [1] Audit Warning Fields
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS "risk_level" TEXT DEFAULT 'low',     -- low, medium, high
ADD COLUMN IF NOT EXISTS "risk_reasons" TEXT[],               -- Array of risk reasons
ADD COLUMN IF NOT EXISTS "is_flagged_for_review" BOOLEAN DEFAULT false;

-- [2] Audit Exceptions View
CREATE OR REPLACE VIEW public.audit_exceptions_report AS
SELECT 
    id, org_id, vendor_name, total_amount, created_at, risk_reasons
FROM public.transactions
WHERE risk_level != 'low' OR is_flagged_for_review = true;

-- [3] Duplicate Check Function
-- Fixed: Added missing p_record_id parameter and NULL handling for logic
CREATE OR REPLACE FUNCTION check_duplicate_transaction(
    p_org_id uuid, 
    p_vendor text, 
    p_date date, 
    p_amount numeric,
    p_record_id uuid DEFAULT NULL
) RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.transactions 
        WHERE org_id = p_org_id 
          AND vendor_name = p_vendor 
          AND transaction_date = p_date 
          AND total_amount = p_amount
          AND (p_record_id IS NULL OR id != p_record_id) -- Exclude self if ID provided
    );
END;
$$ LANGUAGE plpgsql;
