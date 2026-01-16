-- [1] Add Golden Dataset Verification Flag
-- This field is used to manually verify high-quality data for future AI model training/finetuning.

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS "is_verified_by_boss" BOOLEAN DEFAULT false;

ALTER TABLE public.material_market_prices
ADD COLUMN IF NOT EXISTS "is_verified_by_boss" BOOLEAN DEFAULT false;

-- Enhance RLS (Optional, but good practice):
-- Ensure only Admins/Owners can toggle this flag.
-- Since we are just adding columns, existing update policies usually cover the row.
-- If granular field-level permission is needed, we'd need trigger or separate policy, 
-- but for MVP Dev environment, adding the column is sufficient.
