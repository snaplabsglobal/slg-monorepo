-- [1] CSI MasterFormat Reference Table (The DNA)
CREATE TABLE IF NOT EXISTS "public"."csi_masterformat_ref" (
    "code" TEXT PRIMARY KEY, -- e.g., '09 29 00'
    "level" INTEGER,         -- 1, 2, 3, 4
    "description" TEXT,
    "parent_code" TEXT REFERENCES "public"."csi_masterformat_ref"("code"),
    "created_at" timestamptz DEFAULT now()
);

-- Seed some basic Data (Div 9 Finishes, Div 6 Wood)
INSERT INTO "public"."csi_masterformat_ref" ("code", "level", "description", "parent_code") VALUES
('06 00 00', 1, 'Wood, Plastics, and Composites', NULL),
('06 10 00', 2, 'Rough Carpentry', '06 00 00'),
('06 11 00', 3, 'Wood Framing', '06 10 00'),
('09 00 00', 1, 'Finishes', NULL),
('09 20 00', 2, 'Plaster and Gypsum Board', '09 00 00'),
('09 29 00', 3, 'Gypsum Board', '09 20 00')
ON CONFLICT DO NOTHING;

-- [2] Cost Book Items (Atomic Units)
CREATE TABLE IF NOT EXISTS "public"."cost_book_items" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "csi_code" TEXT REFERENCES "public"."csi_masterformat_ref"("code"),
    "description" TEXT, -- e.g. "5/8 Fire Rated Drywall"
    "unit" TEXT,        -- SF, LF, EA
    -- Material
    "material_net" numeric(10,2) DEFAULT 0,
    "waste_factor" numeric(4,2) DEFAULT 1.10, -- 10% waste
    -- Labor
    "productivity_rate" numeric(10,4), -- Units per Hour (e.g., 20 SF/Hr)
    "wage_rate" numeric(10,2),         -- $/Hr
    -- Equip & Sub
    "equipment_rate" numeric(10,2) DEFAULT 0,
    "subcontractor_rate" numeric(10,2) DEFAULT 0,
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- [3] Assembly Logic (One-Click Kits)
CREATE TABLE IF NOT EXISTS "public"."assemblies" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "code" TEXT UNIQUE, -- e.g., 'ASS-WALL-01'
    "name" TEXT,        -- e.g., 'Standard 2x4 Partition, 5/8 Drywall 2 sides'
    "unit" TEXT,        -- LF (Linear Feet)
    "description" TEXT
);

CREATE TABLE IF NOT EXISTS "public"."assembly_components" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "assembly_id" uuid REFERENCES "public"."assemblies"("id"),
    "cost_book_item_id" uuid REFERENCES "public"."cost_book_items"("id"),
    "quantity_per_assembly_unit" numeric(10,4) -- e.g., 1 LF of Wall needs 8 SF of Drywall (4ft high * 2 sides?) -> logic depends on height
);

-- [4] Estimations & Items (Actual Project Estimates)
CREATE TABLE IF NOT EXISTS "public"."estimations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES "public"."projects"("id"),
    "name" TEXT,
    "status" TEXT DEFAULT 'Draft',
    -- Adjustment Engine Factors
    "location_factor" numeric(5,2) DEFAULT 1.0, -- Vancouver 1.2
    "complexity_factor" numeric(5,2) DEFAULT 1.0, -- Renovation 1.25
    "markup_percentage" numeric(5,2) DEFAULT 1.20, -- 20% Overhead & Profit
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "public"."estimation_items" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "estimation_id" uuid REFERENCES "public"."estimations"("id"),
    "csi_code" TEXT REFERENCES "public"."csi_masterformat_ref"("code"),
    "description" TEXT,
    "quantity" numeric(12,2),
    "unit" TEXT,
    -- Snapshot of Atomic Costs at time of Estimation
    "unit_material_cost" numeric(10,2), 
    "unit_labor_cost" numeric(10,2),
    "unit_equipment_cost" numeric(10,2),
    "unit_sub_cost" numeric(10,2),
    "created_at" timestamptz DEFAULT now()
);

-- [5] Modify Transaction Items to link CSI
ALTER TABLE "public"."transaction_items"
ADD COLUMN IF NOT EXISTS "csi_code" TEXT REFERENCES "public"."csi_masterformat_ref"("code");

-- [6] View Layer (Cost / Proposal / SOV)

-- View A: Cost View (Internal Net)
CREATE OR REPLACE VIEW public.view_estimation_cost AS
SELECT 
    ei.estimation_id,
    ei.csi_code,
    cm.description as csi_description,
    ei.description as item_description,
    ei.quantity,
    ei.unit,
    -- Atomic Calculations
    (ei.unit_material_cost * ei.quantity) as total_material,
    (ei.unit_labor_cost * ei.quantity) as total_labor,
    (ei.unit_equipment_cost * ei.quantity) as total_equipment,
    (ei.unit_sub_cost * ei.quantity) as total_sub,
    -- Total Net
    ((ei.unit_material_cost + ei.unit_labor_cost + ei.unit_equipment_cost + ei.unit_sub_cost) * ei.quantity) as total_net_cost
FROM public.estimation_items ei
LEFT JOIN public.csi_masterformat_ref cm ON ei.csi_code = cm.code;

-- View B: Proposal View (With Factors & Markup)
CREATE OR REPLACE VIEW public.view_estimation_proposal AS
SELECT 
    vec.*,
    e.location_factor,
    e.complexity_factor,
    e.markup_percentage,
    -- Final Price Calculation
    (vec.total_net_cost * e.location_factor * e.complexity_factor * e.markup_percentage) as final_client_price
FROM public.view_estimation_cost vec
JOIN public.estimations e ON vec.estimation_id = e.id;

-- View C: SOV View (Aggregated by CSI Division)
CREATE OR REPLACE VIEW public.view_estimation_sov AS
SELECT 
    e.id as estimation_id,
    SUBSTRING(ei.csi_code FROM 1 FOR 2) as division_code, -- '09'
    SUM((ei.unit_material_cost + ei.unit_labor_cost + ei.unit_equipment_cost + ei.unit_sub_cost) * ei.quantity * e.location_factor * e.complexity_factor * e.markup_percentage) as division_total
FROM public.estimation_items ei
JOIN public.estimations e ON ei.estimation_id = e.id
GROUP BY e.id, SUBSTRING(ei.csi_code FROM 1 FOR 2);

-- ENABLE RLS
ALTER TABLE "public"."csi_masterformat_ref" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."cost_book_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assemblies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assembly_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estimations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estimation_items" ENABLE ROW LEVEL SECURITY;

-- Basic Read Policies (Authenticated)
CREATE POLICY "Auth read csi" ON "public"."csi_masterformat_ref" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read cost book" ON "public"."cost_book_items" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read assemblies" ON "public"."assemblies" FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Auth read assembly components" ON "public"."assembly_components" FOR SELECT USING (auth.role() = 'authenticated');

-- Estimation Policies (Owner based)
CREATE POLICY "Owners manage estimations" ON "public"."estimations" USING (
    EXISTS (SELECT 1 FROM public.projects p JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE p.id = estimations.project_id AND om.user_id = auth.uid())
);

CREATE POLICY "Owners manage estimation items" ON "public"."estimation_items" USING (
    EXISTS (SELECT 1 FROM public.estimations e JOIN public.projects p ON e.project_id = p.id JOIN public.organization_members om ON p.organization_id = om.organization_id WHERE e.id = estimation_items.estimation_id AND om.user_id = auth.uid())
);
