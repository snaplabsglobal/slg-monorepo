-- Migration: Full Ecosystem (Labor v2.4 + Home Hero)
-- Timestamp: 20260114092500

BEGIN;

-- 0. Ensure Employees Table Exists (Base Structure)
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    full_name TEXT NOT NULL,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Force-Add Logic Columns (Idempotent / Evolutionary)
DO $$
BEGIN
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS overtime_enabled BOOLEAN DEFAULT false;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS ot_multiplier NUMERIC(3, 2) DEFAULT 1.0;
    ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS is_diy_hero BOOLEAN DEFAULT false; -- [NEW] Owner Marker
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 2. Property Assets (Home Hero Module) [NEW]
CREATE TABLE IF NOT EXISTS public.property_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    address TEXT NOT NULL,
    purchase_date DATE,
    purchase_price NUMERIC(15, 2),
    estimated_value NUMERIC(15, 2),
    
    metadata JSONB DEFAULT '{}', -- specs, area, notes
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Time Entries (Standard)
CREATE TABLE IF NOT EXISTS public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    break_duration INT DEFAULT 0,
    
    -- Immutable Fix: UTC Timezone
    period_date DATE GENERATED ALWAYS AS ((start_time AT TIME ZONE 'UTC')::date) STORED,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT check_positive_duration CHECK (end_time > start_time)
);

-- 4. Payrolls (Settlement)
CREATE TABLE IF NOT EXISTS public.payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    gross_pay NUMERIC(15, 2) DEFAULT 0,
    net_pay NUMERIC(15, 2) DEFAULT 0,
    bonus NUMERIC(15, 2) DEFAULT 0,
    
    transaction_id UUID REFERENCES public.transactions(id),
    
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Logic Function (Updated for DIY Hero)
CREATE OR REPLACE FUNCTION calculate_bc_labor_cost(
    duration_minutes numeric, 
    hourly_rate numeric,
    overtime_enabled boolean DEFAULT false,
    is_diy_hero boolean DEFAULT false -- [NEW]
) RETURNS numeric AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    -- DIY Hero = Free Labor (Sweat Equity is tracked as hours, but Cost is 0)
    IF is_diy_hero THEN
        RETURN 0;
    END IF;

    hours := duration_minutes / 60.0;
    
    IF NOT overtime_enabled THEN
        RETURN ROUND(hours * hourly_rate, 2);
    END IF;

    -- BC Rules: >8h=1.5x, >12h=2.0x
    IF hours <= 8 THEN
        cost := hours * hourly_rate;
    ELSIF hours <= 12 THEN
        cost := (8 * hourly_rate) + ((hours - 8) * hourly_rate * 1.5);
    ELSE
        cost := (8 * hourly_rate) + (4 * hourly_rate * 1.5) + ((hours - 12) * hourly_rate * 2.0);
    END IF;
    
    RETURN ROUND(cost, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 6. Unified Project Financials View (Rebuild)
DROP VIEW IF EXISTS project_financials_summary;

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
            calculate_bc_labor_cost(
                EXTRACT(EPOCH FROM (te.end_time - te.start_time)) / 60 - te.break_duration, 
                e.hourly_rate,
                e.overtime_enabled,
                e.is_diy_hero -- Pass Flag
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

COMMIT;
