-- 1. Hardening (Soft Deletes)
-- Projects
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz,
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

-- Transactions (Receipts)
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz,
ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT 'PURCHASE' CHECK (source_type IN ('PURCHASE', 'INTERNAL_STOCK'));

-- Stock Presets (Items)
ALTER TABLE "public"."stock_presets"
ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz,
ADD COLUMN IF NOT EXISTS "metadata" jsonb DEFAULT '{}'::jsonb;

-- Estimates
ALTER TABLE "public"."estimates"
ADD COLUMN IF NOT EXISTS "is_deleted" boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;


-- 2. Tax & Accounting
-- Tax Rules
CREATE TABLE IF NOT EXISTS "public"."tax_rules" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "region" text NOT NULL, -- e.g., 'BC', 'ON', 'WA'
    "tax_type" text NOT NULL, -- e.g., 'GST', 'PST', 'HST'
    "rate" numeric NOT NULL, -- e.g., 0.05
    "is_recoverable" boolean DEFAULT true,
    "created_at" timestamptz DEFAULT now()
);

-- Receipt/Transaction Items Enrichment
ALTER TABLE "public"."transaction_items"
ADD COLUMN IF NOT EXISTS "tax_amount_cents" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "gst_cents" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "pst_cents" integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS "itc_eligible" boolean DEFAULT true;


-- 3. Trade Specifics (Organizations)
-- Re-apply clearer constraint if needed, allowing 'custom'
ALTER TABLE "public"."organizations"
DROP CONSTRAINT IF EXISTS "organizations_trade_type_check";

ALTER TABLE "public"."organizations"
ADD CONSTRAINT "organizations_trade_type_check"
CHECK (trade_type IN ('general', 'electrician', 'plumber', 'hvac', 'carpenter', 'painter', 'custom'));

-- Stock Presets improvements
ALTER TABLE "public"."stock_presets"
ADD COLUMN IF NOT EXISTS "trade_type" text, -- Tag items by trade
ADD COLUMN IF NOT EXISTS "category" text; -- e.g. 'Rough-in', 'Finish'


-- 4. Audit Logs
CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "table_name" text NOT NULL,
    "record_id" uuid NOT NULL,
    "action" text NOT NULL, -- INSERT, UPDATE, DELETE, SOFT_DELETE
    "user_id" uuid REFERENCES "public"."profiles" ON DELETE SET NULL,
    "old_value" jsonb,
    "new_value" jsonb,
    "created_at" timestamptz DEFAULT now()
);

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
-- Admins read all, Users read own? For now, open read for authorized staff
CREATE POLICY "Staff read audits" ON "public"."audit_logs" FOR SELECT USING (true);


-- 5. Attachments (Resource Pool)
CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "file_url" text NOT NULL,
    "file_type" text NOT NULL, -- 'image', 'pdf', 'signature'
    "associated_table" text NOT NULL, -- 'transactions', 'projects', 'compliance'
    "associated_record_id" uuid NOT NULL,
    "metadata" jsonb DEFAULT '{}'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "uploaded_by" uuid REFERENCES "public"."profiles"
);

ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users map attachments" ON "public"."attachments" FOR ALL USING (auth.uid() = uploaded_by);
