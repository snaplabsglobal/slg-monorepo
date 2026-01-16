-- [0] Clean up previous iteration (if exists)
DROP VIEW IF EXISTS public.view_estimation_sov;
DROP VIEW IF EXISTS public.view_estimation_proposal;
DROP VIEW IF EXISTS public.view_estimation_cost;
DROP TABLE IF EXISTS public.estimation_items;
DROP TABLE IF EXISTS public.estimations;
DROP TABLE IF EXISTS public.assembly_components;
DROP TABLE IF EXISTS public.assemblies;
DROP TABLE IF EXISTS public.cost_book_items;
-- Drop csi_masterformat_ref last due to FKs
ALTER TABLE public.transaction_items DROP COLUMN IF EXISTS csi_code;
DROP TABLE IF EXISTS public.csi_masterformat_ref;


-- [1] CSI MasterFormat Standard Library
CREATE TABLE IF NOT EXISTS "public"."csi_codes" (
    "code" TEXT PRIMARY KEY, -- '09 29 00.10'
    "level" INTEGER NOT NULL,
    "division" TEXT NOT NULL, -- '09'
    "description" TEXT NOT NULL,
    "parent_code" TEXT REFERENCES public.csi_codes(code)
);

CREATE INDEX IF NOT EXISTS idx_csi_division ON public.csi_codes(division);

-- Seed Basic Data
INSERT INTO "public"."csi_codes" ("code", "level", "division", "description", "parent_code") VALUES
('06 00 00', 1, '06', 'Wood, Plastics, and Composites', NULL),
('06 11 00', 2, '06', 'Wood Framing', '06 00 00'),
('09 00 00', 1, '09', 'Finishes', NULL),
('09 29 00', 2, '09', 'Gypsum Board', '09 00 00')
ON CONFLICT DO NOTHING;

-- [2] Unit Cost Detail Table (Atomic Design)
CREATE TABLE IF NOT EXISTS "public"."unit_rates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid NOT NULL REFERENCES auth.users(id), -- Linked to User/Org
    "csi_code" TEXT REFERENCES public.csi_codes(code),
    "item_name" TEXT NOT NULL,
    "unit" TEXT NOT NULL, -- 'SQFT', 'LF', 'EA'

    -- Material
    "material_cost_net" numeric(10,2) DEFAULT 0,
    "waste_factor" numeric(4,2) DEFAULT 1.05, -- 5% waste

    -- Labor - Core Formula: (1 / productivity) * wage
    "productivity_rate" numeric(10,2), -- Units/Hr (e.g., 40 sqft/hr)
    "wage_rate" numeric(10,2),         -- $/Hr (e.g., $45/hr)

    -- Equipment & Sub
    "equipment_rate" numeric(10,2) DEFAULT 0,
    "sub_markup_percent" numeric(4,2) DEFAULT 1.0, 

    "created_at" timestamptz DEFAULT now()
);

-- [3] Assemblies (Recipes)
CREATE TABLE IF NOT EXISTS "public"."assemblies" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid NOT NULL REFERENCES auth.users(id),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "base_unit" TEXT NOT NULL -- 'LF'
);

-- [4] Assembly Components
CREATE TABLE IF NOT EXISTS "public"."assembly_components" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "assembly_id" uuid REFERENCES public.assemblies(id) ON DELETE CASCADE,
    "unit_rate_id" uuid REFERENCES public.unit_rates(id),
    "quantity_ratio" numeric(10,4) NOT NULL -- Ratio: units needed per 1 Assembly Unit
);

-- [5] Estimates Main Table
CREATE TABLE IF NOT EXISTS "public"."estimates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES public.projects(id),
    "version" INTEGER DEFAULT 1,
    
    -- Factors
    "location_factor" numeric(4,2) DEFAULT 1.00,
    "complexity_factor" numeric(4,2) DEFAULT 1.00,
    "global_markup_percent" numeric(4,2) DEFAULT 1.20,
    
    "status" TEXT DEFAULT 'draft', -- draft, sent, approved
    "created_at" timestamptz DEFAULT now()
);

-- [6] Estimate Items (Supports Assembly or Single Item)
CREATE TABLE IF NOT EXISTS "public"."estimate_items" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "estimate_id" uuid REFERENCES public.estimates(id) ON DELETE CASCADE,
    "csi_code" TEXT REFERENCES public.csi_codes(code),
    "description" TEXT,
    "quantity" numeric(12,2) NOT NULL,
    "unit" TEXT,
    
    -- Snapshot to freeze price at estimation time
    "unit_cost_snapshot" numeric(10,2), 
    "markup_override" numeric(4,2),
    
    "is_from_assembly" BOOLEAN DEFAULT false
);

-- [7] Link Transaction Items
ALTER TABLE public.transaction_items 
ADD COLUMN IF NOT EXISTS csi_code TEXT REFERENCES public.csi_codes(code);


-- Enable RLS
ALTER TABLE "public"."csi_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."unit_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assemblies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."assembly_components" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estimates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."estimate_items" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read csi" ON "public"."csi_codes" FOR SELECT USING (true); -- Public Standard

-- Unit Rates: Owners see own
CREATE POLICY "Owners manage unit_rates" ON "public"."unit_rates" USING (auth.uid() = org_id);

-- Assemblies: Owners see own
CREATE POLICY "Owners manage assemblies" ON "public"."assemblies" USING (auth.uid() = org_id);

-- Estimates: Access via Project Org
CREATE POLICY "Owners manage estimates" ON "public"."estimates" USING (
    EXISTS (
        SELECT 1 FROM public.projects p 
        JOIN public.organization_members om ON p.organization_id = om.organization_id 
        WHERE p.id = estimates.project_id AND om.user_id = auth.uid()
    )
);

CREATE POLICY "Owners manage estimate items" ON "public"."estimate_items" USING (
    EXISTS (
        SELECT 1 FROM public.estimates e 
        JOIN public.projects p ON e.project_id = p.id 
        JOIN public.organization_members om ON p.organization_id = om.organization_id 
        WHERE e.id = estimate_items.estimate_id AND om.user_id = auth.uid()
    )
);
