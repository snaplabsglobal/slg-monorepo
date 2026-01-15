-- Migration: Security Fixes, Labor Logic Refactor, and RLS Policies (Fix Dependencies)
-- Timestamp: 20260114200000

BEGIN;

-- [0] Drop Dependent View First
DROP VIEW IF EXISTS public.project_financials_summary;

-- [1] Function Slimming & Logic Unification
-- Drop old overloaded signatures to avoid ambiguity
DROP FUNCTION IF EXISTS public.calculate_bc_labor_cost(numeric, numeric);
DROP FUNCTION IF EXISTS public.calculate_bc_labor_cost(numeric, numeric, boolean);
DROP FUNCTION IF EXISTS public.calculate_bc_labor_cost(numeric, numeric, boolean, boolean);

-- Unified Function Definition
CREATE OR REPLACE FUNCTION public.calculate_bc_labor_cost(
    duration_minutes numeric, 
    hourly_rate numeric, 
    overtime_enabled boolean DEFAULT false, 
    is_diy_hero boolean DEFAULT false
) RETURNS numeric
LANGUAGE "plpgsql" IMMUTABLE
AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    -- DIY Hero (Sweat Equity) = 0 Cost
    IF is_diy_hero THEN RETURN 0; END IF;

    hours := duration_minutes / 60.0;
    
    IF NOT overtime_enabled THEN
        RETURN ROUND(hours * hourly_rate, 2);
    END IF;

    -- BC Employment Standards Act Logic
    -- 0-8 hrs: 1.0x
    -- 8-12 hrs: 1.5x
    -- >12 hrs: 2.0x
    IF hours <= 8 THEN
        cost := hours * hourly_rate;
    ELSIF hours <= 12 THEN
        cost := (8 * hourly_rate) + ((hours - 8) * hourly_rate * 1.5);
    ELSE
        cost := (8 * hourly_rate) + (4 * hourly_rate * 1.5) + ((hours - 12) * hourly_rate * 2.0);
    END IF;
    
    RETURN ROUND(cost, 2);
END;
$$;

-- [2] Recreate View (Using Unified Function)
CREATE OR REPLACE VIEW project_financials_summary AS
WITH material_costs AS (
    SELECT 
        project_id, 
        COALESCE(SUM(total_amount), 0) as total_materials
    FROM transactions
    WHERE direction = 'expense' AND project_id IS NOT NULL
    GROUP BY project_id
),
labor_costs AS (
    SELECT 
        te.project_id,
        COALESCE(SUM(
            public.calculate_bc_labor_cost(
                EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 60 - te.break_duration, 
                e.hourly_rate,
                e.overtime_enabled,
                e.is_diy_hero
            )
        ), 0) as total_labor,
        COALESCE(SUM(EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 3600), 0) as total_hours
    FROM time_entries te
    JOIN employees e ON te.employee_id = e.id
    GROUP BY te.project_id
)
SELECT 
    p.id as project_id,
    p.name as project_name,
    COALESCE(m.total_materials, 0) as cost_materials,
    COALESCE(l.total_labor, 0) as cost_labor,
    COALESCE(l.total_hours, 0) as total_hours_worked,
    (COALESCE(m.total_materials, 0) + COALESCE(l.total_labor, 0)) as total_project_cost
FROM projects p
LEFT JOIN material_costs m ON p.id = m.project_id
LEFT JOIN labor_costs l ON p.id = l.project_id;


-- [3] Security Fix: Remove Hardcoded Tokens & Merge Triggers
-- Drop existing triggers to replace with secure version
DROP TRIGGER IF EXISTS ai_parsing_trigger ON storage.objects;
DROP TRIGGER IF EXISTS process_on_upload ON storage.objects;

-- Create secure trigger calling Edge Function via Internal Supabase Network
-- EXECUTE FUNCTION supabase_functions.http_request(
--     'https://zqbudwdlwogimrzdmduq.supabase.co/functions/v1/receipt-processor',
--     'POST',
--     '{"Content-type":"application/json"}',
--     '{}',
--     '5000'
-- );
-- 
-- CREATE TRIGGER receipt_processing_trigger
-- AFTER INSERT ON storage.objects
-- FOR EACH ROW
-- WHEN (new.bucket_id = 'receipt-images')
-- EXECUTE FUNCTION supabase_functions.http_request(
--     'https://zqbudwdlwogimrzdmduq.supabase.co/functions/v1/receipt-processor',
--     'POST',
--     '{"Content-type":"application/json"}',
--     '{}',
--     '5000'
-- );

-- [4] RLS Multi-Tenancy Security Walls
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Note: Policies need to be dropped if they exist to avoid error on replay, or use DO block
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can only access their org's transactions" ON public.transactions;
    DROP POLICY IF EXISTS "Users can only access their org's projects" ON public.projects;
END $$;

-- Policy: Authenticated users can only access data belonging to their Organization
CREATE POLICY "Users can only access their org's transactions"
ON public.transactions
FOR ALL
TO authenticated
USING (
    org_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can only access their org's projects"
ON public.projects
FOR ALL
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid()
    )
);

COMMIT;
