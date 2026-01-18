-- 1. Estimates Module
CREATE TABLE IF NOT EXISTS "public"."estimates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- Ensure columns exist (Safeguard against existing partial table)
ALTER TABLE "public"."estimates" ADD COLUMN IF NOT EXISTS "organization_id" "uuid" NOT NULL;
ALTER TABLE "public"."estimates" ADD COLUMN IF NOT EXISTS "name" "text" NOT NULL DEFAULT 'Quote';
ALTER TABLE "public"."estimates" ADD COLUMN IF NOT EXISTS "status" "text" DEFAULT 'draft'::"text";
ALTER TABLE "public"."estimates" ADD COLUMN IF NOT EXISTS "total_amount" numeric(15,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS "public"."estimate_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "estimate_id" "uuid" NOT NULL REFERENCES "public"."estimates"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);

ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "description" "text" NOT NULL DEFAULT 'Item';
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "cost_type" "text" DEFAULT 'material'::"text";
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "quantity" numeric(10,2) DEFAULT 1;
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "unit_price" numeric(15,2) DEFAULT 0;
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "markup_percentage" numeric(5,2) DEFAULT 0;
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "total_price" numeric(15,2) GENERATED ALWAYS AS (("quantity" * "unit_price" * (1 + "markup_percentage"/100))) STORED;
ALTER TABLE "public"."estimate_items" ADD COLUMN IF NOT EXISTS "csi_code" "text";

-- 2. Organization Branding
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "branding_json" JSONB DEFAULT '{"primary_color": "#1A4F8B", "logo_url": null, "disclaimer": null}'::jsonb;

-- 3. Featured Media for Reports
ALTER TABLE "public"."project_media"
ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN DEFAULT false;

-- 4. Status Code Enforcement
-- Ensure existing statuses map correctly or just add the check constraint
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "status_code" "text" DEFAULT '00';

-- Add constraint specific to SLG logic
-- 00: Estimating, 01: Active, 02: Settling, 03: Archive
ALTER TABLE "public"."projects"
DROP CONSTRAINT IF EXISTS "projects_status_code_check";

ALTER TABLE "public"."projects"
ADD CONSTRAINT "projects_status_code_check" 
CHECK ("status_code" IN ('00', '01', '02', '03'));

-- RLS for new tables
ALTER TABLE "public"."estimates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estimate_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view estimates" ON "public"."estimates"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_members.organization_id = estimates.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can view estimate items" ON "public"."estimate_items"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM estimates
        JOIN organization_members ON estimates.organization_id = organization_members.organization_id
        WHERE estimates.id = estimate_items.estimate_id
        AND organization_members.user_id = auth.uid()
    )
);
