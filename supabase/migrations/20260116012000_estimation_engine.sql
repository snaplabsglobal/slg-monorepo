-- [1] Estimation Templates Table (The Assemblies)
CREATE TABLE IF NOT EXISTS "public"."estimation_templates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "template_name" TEXT,        -- e.g., 'Bathroom Full Reno'
    "category" TEXT,             -- Residential, Commercial, etc.
    "base_labor_hours" numeric,  -- Theoretical labor hours
    "material_list" JSONB,       -- List of standardized material names required
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."estimation_templates" ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read templates
CREATE POLICY "Authenticated users can read templates" ON "public"."estimation_templates"
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Admins/Service Role can manage templates (Implicit for Service Role)
-- Keeping it simple for now as requested.

-- [2] Active Cost Benchmark View
-- Matches template materials with live Data Factory prices
CREATE OR REPLACE VIEW public.active_cost_benchmark AS
SELECT 
    et.template_name,
    mmp.material_name,
    mmp.price as current_market_price,
    mmp.vendor_id, -- Correct column name from Data Factory
    mmp.region_code,
    mmp.captured_at
FROM public.estimation_templates et
CROSS JOIN LATERAL jsonb_array_elements_text(et.material_list) as template_material
JOIN public.material_market_prices mmp ON mmp.material_name = template_material
WHERE mmp.captured_at > NOW() - INTERVAL '60 days';
