-- 1. Measurements (The "Source of Truth" for Quantities)
CREATE TABLE IF NOT EXISTS "public"."measurements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
    "label" "text" NOT NULL, -- e.g. "Master Bedroom"
    "area_sqft" numeric(10,2) DEFAULT 0,
    "perimeter_ft" numeric(10,2) DEFAULT 0,
    "wall_height_ft" numeric(10,2) DEFAULT 8.0, -- Standard Ceiling
    "raw_json" "jsonb", -- Vector path data
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- 2. Assemblies (Bundles of Logic)
CREATE TABLE IF NOT EXISTS "public"."assemblies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL, -- e.g. "Standard Bathroom Renovation"
    "logic_config" "jsonb" NOT NULL DEFAULT '{}'::jsonb, -- e.g. { "drywall": "perimeter * height", "paint": "area" }
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- 3. Update Estimate Items (Link to Reality)
ALTER TABLE "public"."estimate_items"
ADD COLUMN IF NOT EXISTS "unit_cost" numeric(15,2) DEFAULT 0, -- Base Cost (Internal)
ADD COLUMN IF NOT EXISTS "reference_measurement_id" "uuid" REFERENCES "public"."measurements"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "calc_formula" "text", -- e.g. "area", "perimeter", "wall_area" (= perimeter * height)
ADD COLUMN IF NOT EXISTS "is_optional" boolean DEFAULT false;

-- 4. Update Change Orders (Audit Trail)
ALTER TABLE "public"."change_orders"
ADD COLUMN IF NOT EXISTS "ref_estimate_item_id" "uuid" REFERENCES "public"."estimate_items"("id") ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS "is_deduction" boolean DEFAULT false;

-- 5. RLS
ALTER TABLE "public"."measurements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assemblies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view measurements" ON "public"."measurements"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        JOIN organization_members ON projects.organization_id = organization_members.organization_id
        WHERE projects.id = measurements.project_id
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can view assemblies" ON "public"."assemblies"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_members.organization_id = assemblies.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- 6. Automation Logic (The "Magic")
-- Trigger: When Measurement Updates -> Recalculate linked Estimate Items
CREATE OR REPLACE FUNCTION public.fn_update_estimate_quantities()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all items linked to this measurement
    UPDATE public.estimate_items
    SET quantity = CASE 
        WHEN calc_formula = 'area' THEN NEW.area_sqft
        WHEN calc_formula = 'perimeter' THEN NEW.perimeter_ft
        WHEN calc_formula = 'wall_area' THEN (NEW.perimeter_ft * NEW.wall_height_ft)
        ELSE quantity -- No formula, keep manual
    END,
    -- Recalculate Total Price (Stored Column usually handles this, but if derived, we just notify)
    -- Our generated column "total_price" depends on "quantity", so updating "quantity" is enough!
    updated_at = NOW()
    WHERE reference_measurement_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_measurements_update_quantities
AFTER UPDATE ON public.measurements
FOR EACH ROW
EXECUTE FUNCTION public.fn_update_estimate_quantities();
