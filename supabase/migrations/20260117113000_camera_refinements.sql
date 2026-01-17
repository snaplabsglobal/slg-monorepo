-- Add is_overhead flag for General/Office expenses
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS "is_overhead" BOOLEAN DEFAULT false;

-- Index for analytics
CREATE INDEX IF NOT EXISTS "idx_transactions_overhead" ON "public"."transactions" ("is_overhead");
