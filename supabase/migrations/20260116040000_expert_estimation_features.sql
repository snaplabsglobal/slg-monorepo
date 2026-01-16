-- [1] Shadow Estimating (for Subcontractors)
-- Allows splitting a lump sum quote into hypothetical buckets for data mining.
CREATE TABLE IF NOT EXISTS "public"."shadow_allocations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "estimate_item_id" uuid REFERENCES "public"."estimate_items"("id") ON DELETE CASCADE,
    "sub_quote_amount" numeric(15,2), -- The total quote received
    -- Ratios to split the quote for analytics
    "labor_ratio" numeric(4,2),    -- e.g. 0.60
    "material_ratio" numeric(4,2), -- e.g. 0.30
    "overhead_ratio" numeric(4,2), -- e.g. 0.10
    "notes" TEXT,
    "created_at" timestamptz DEFAULT now()
);

-- [2] Dual-Track Change Orders (Alter existing table)
-- Tracks changes separately from the original estimate baseline.

-- Add new columns if not exist
ALTER TABLE public.change_orders 
ADD COLUMN IF NOT EXISTS "estimate_id" uuid REFERENCES "public"."estimates"("id") ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS "reason_code" TEXT, -- 'Client Request', 'site_condition', 'code_compliance', 'design_change'
ADD COLUMN IF NOT EXISTS "change_order_number" TEXT,
ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;

-- Ensure 'amount' column exists (if mapped from amount_change or new)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='change_orders' AND column_name='amount') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='change_orders' AND column_name='amount_change') THEN
            ALTER TABLE public.change_orders RENAME COLUMN "amount_change" TO "amount";
        ELSE
            ALTER TABLE public.change_orders ADD COLUMN "amount" numeric(15,2) DEFAULT 0;
        END IF;
    END IF;
END $$;

-- Drop Policy if exists to recreate
DROP POLICY IF EXISTS "Owners manage change orders" ON "public"."change_orders";
-- Tracks how specific crews/users perform against standard productivity.
CREATE TABLE IF NOT EXISTS "public"."crew_efficiency" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "profile_id" uuid REFERENCES "public"."profiles"("id"), -- The worker/manager
    "csi_division" TEXT, -- e.g. '09' for Finishes
    "efficiency_score" numeric(4,2) DEFAULT 1.0, -- 1.0 = Standard. 1.2 = Fast. 0.8 = Slow.
    "notes" TEXT,
    "last_evaluated_at" timestamptz DEFAULT now(),
    "created_at" timestamptz DEFAULT now()
);

-- [4] Profit Guard (Hidden Cost Protection)
-- System-level checks to auto-add fees based on conditions.
CREATE TABLE IF NOT EXISTS "public"."profit_guard" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid REFERENCES auth.users(id), -- Configurable per Org
    "name" TEXT NOT NULL, -- e.g. 'Strata Elevator Fee'
    "trigger_condition" TEXT, -- 'address_has_suite', 'has_demolition', 'is_condo'
    "fee_type" TEXT DEFAULT 'flat', -- 'flat', 'percent'
    "fee_value" numeric(10,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."shadow_allocations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."change_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."crew_efficiency" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profit_guard" ENABLE ROW LEVEL SECURITY;

-- Policies (Standard Owner Access)
-- Shadow Allocations: Viewable by Estimate Owner
CREATE POLICY "Owners manage shadow allocations" ON "public"."shadow_allocations" USING (
    EXISTS (
        SELECT 1 FROM public.estimate_items ei 
        JOIN public.estimates e ON ei.estimate_id = e.id
        JOIN public.projects p ON e.project_id = p.id
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE ei.id = shadow_allocations.estimate_item_id AND om.user_id = auth.uid()
    )
);

-- Change Orders: Viewable by Estimate Owner
CREATE POLICY "Owners manage change orders" ON "public"."change_orders" USING (
    EXISTS (
        SELECT 1 FROM public.estimates e 
        JOIN public.projects p ON e.project_id = p.id
        JOIN public.organization_members om ON p.organization_id = om.organization_id
        WHERE e.id = change_orders.estimate_id AND om.user_id = auth.uid()
    )
);

-- Crew Efficiency: Viewable by Org Admin/Owner
CREATE POLICY "Admins manage crew efficiency" ON "public"."crew_efficiency" USING (
    EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.role IN ('Owner', 'Admin')
        -- Note: simplified check, assuming profile_id belongs to same org. 
        -- Ideally link profile -> org explicitly or via employment table. 
        -- For MVP, assuming if you are an admin you can see efficiencies.
    )
);

-- Profit Guard: Viewable by Org Owner
CREATE POLICY "Owners manage profit guard" ON "public"."profit_guard" USING (auth.uid() = org_id);

