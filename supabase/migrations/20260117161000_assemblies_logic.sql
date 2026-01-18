-- Assemblies / Recipes Table
CREATE TABLE IF NOT EXISTS "public"."assemblies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- Ensure columns exist
ALTER TABLE "public"."assemblies" ADD COLUMN IF NOT EXISTS "organization_id" "uuid" NOT NULL;
ALTER TABLE "public"."assemblies" ADD COLUMN IF NOT EXISTS "name" "text" NOT NULL DEFAULT 'Assembly';
ALTER TABLE "public"."assemblies" ADD COLUMN IF NOT EXISTS "description" "text";
ALTER TABLE "public"."assemblies" ADD COLUMN IF NOT EXISTS "category" "text";

CREATE TABLE IF NOT EXISTS "public"."assembly_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "assembly_id" "uuid" NOT NULL REFERENCES "public"."assemblies"("id") ON DELETE CASCADE,
    PRIMARY KEY ("id")
);

-- Ensure columns exist
ALTER TABLE "public"."assembly_items" ADD COLUMN IF NOT EXISTS "description" "text" NOT NULL DEFAULT 'Item';
ALTER TABLE "public"."assembly_items" ADD COLUMN IF NOT EXISTS "cost_type" "text" DEFAULT 'material'::"text";
ALTER TABLE "public"."assembly_items" ADD COLUMN IF NOT EXISTS "default_quantity" numeric(10,2) DEFAULT 1;
ALTER TABLE "public"."assembly_items" ADD COLUMN IF NOT EXISTS "default_unit_price" numeric(15,2) DEFAULT 0;
ALTER TABLE "public"."assembly_items" ADD COLUMN IF NOT EXISTS "csi_code" "text";

-- RLS
ALTER TABLE "public"."assemblies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assembly_items" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view assemblies" ON "public"."assemblies"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_members.organization_id = assemblies.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can view assembly items" ON "public"."assembly_items"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM assemblies
        JOIN organization_members ON assemblies.organization_id = organization_members.organization_id
        WHERE assemblies.id = assembly_items.assembly_id
        AND organization_members.user_id = auth.uid()
    )
);
