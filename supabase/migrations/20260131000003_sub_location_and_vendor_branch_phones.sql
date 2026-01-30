-- COO: "溫哥華最懂裝修師傅" — sub_location + 分店名優先 + 電話綁定
-- 1. vendor_patterns: add sub_location (branch name for this pattern)
-- 2. transactions: add sub_location (branch for this transaction, e.g. Coquitlam, Burnaby)
-- 3. vendor_branch_phones: phone -> sub_location binding (more accurate than text)

BEGIN;

-- vendor_patterns: sub_location column (branch where this pattern was learned)
ALTER TABLE "public"."vendor_patterns"
  ADD COLUMN IF NOT EXISTS "sub_location" TEXT;
COMMENT ON COLUMN "public"."vendor_patterns"."sub_location" IS 'Branch/location for this pattern (e.g. Coquitlam, Burnaby)';

-- transactions: sub_location column (branch for this receipt)
ALTER TABLE "public"."transactions"
  ADD COLUMN IF NOT EXISTS "sub_location" TEXT;
COMMENT ON COLUMN "public"."transactions"."sub_location" IS 'Store branch from receipt (e.g. Coquitlam, Burnaby); used for display and filtering';

-- vendor_branch_phones: phone number -> sub_location binding (one phone = one branch per org)
CREATE TABLE IF NOT EXISTS "public"."vendor_branch_phones" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
  "vendor_name" TEXT NOT NULL,
  "phone_normalized" TEXT NOT NULL,
  "sub_location" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  UNIQUE("organization_id", "phone_normalized")
);
COMMENT ON TABLE "public"."vendor_branch_phones" IS 'Phone on receipt -> branch (sub_location); more accurate than text recognition';

CREATE INDEX IF NOT EXISTS "idx_vendor_branch_phones_org"
  ON "public"."vendor_branch_phones"("organization_id");
CREATE INDEX IF NOT EXISTS "idx_vendor_branch_phones_phone"
  ON "public"."vendor_branch_phones"("organization_id", "phone_normalized");

ALTER TABLE "public"."vendor_branch_phones" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_branch_phones' AND policyname = 'Users can view vendor_branch_phones') THEN
    CREATE POLICY "Users can view vendor_branch_phones" ON "public"."vendor_branch_phones" FOR SELECT
      USING ("public"."is_org_member"("organization_id"));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_branch_phones' AND policyname = 'Users can insert vendor_branch_phones') THEN
    CREATE POLICY "Users can insert vendor_branch_phones" ON "public"."vendor_branch_phones" FOR INSERT
      WITH CHECK ("public"."is_org_member"("organization_id"));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vendor_branch_phones' AND policyname = 'Users can update vendor_branch_phones') THEN
    CREATE POLICY "Users can update vendor_branch_phones" ON "public"."vendor_branch_phones" FOR UPDATE
      USING ("public"."is_org_member"("organization_id"));
  END IF;
END $$;

COMMIT;
