-- [1] User Wage Profile
ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "hourly_wage" numeric(10,2) DEFAULT 30.00;

-- [2] Update Financial View (The "Truth" Source)
DROP VIEW IF EXISTS view_project_financial_summary CASCADE;
CREATE OR REPLACE VIEW view_project_financial_summary AS
WITH budget_agg AS (
    -- Sum of all 'Marked as Sold' estimates
    SELECT 
        e.project_id,
        SUM(ei.quantity * COALESCE(ei.unit_price, 0)) as total_budget
    FROM public.estimates e
    JOIN public.estimate_items ei ON e.id = ei.estimate_id
    WHERE e.status = 'Marked as Sold'
    GROUP BY e.project_id
),
material_agg AS (
    -- Sum of all Expenses
    SELECT 
        t.project_id,
        SUM(t.total_amount) as total_spent_materials
    FROM public.transactions t
    WHERE t.direction = 'expense'
      AND t.status != 'void'
    GROUP BY t.project_id
),
labor_agg AS (
    -- Sum of Timecards (Approved or Pending?) -> Let's say All non-rejected? 
    -- Or active Real-time?
    -- Logic: Duration * User Wage
    SELECT 
        tc.project_id,
        SUM(
            (EXTRACT(EPOCH FROM (COALESCE(tc.end_time, NOW()) - tc.start_time))/3600) 
            * 
            COALESCE(p.hourly_wage, 30.00)
        ) as total_labor_cost
    FROM public.timecards tc
    LEFT JOIN public.profiles p ON tc.employee_id = p.id
    WHERE tc.start_time IS NOT NULL 
    GROUP BY tc.project_id
)
SELECT 
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.status,
    
    COALESCE(b.total_budget, 0) as total_budget,
    COALESCE(m.total_spent_materials, 0) as total_spent_materials,
    COALESCE(l.total_labor_cost, 0) as total_labor_cost,
    
    -- Derived
    (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) as total_spent,
    
    (COALESCE(b.total_budget, 0) - (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0))) as remaining_profit,
    
    CASE 
        WHEN COALESCE(b.total_budget, 0) > 0 THEN 
            ROUND(((COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) / COALESCE(b.total_budget, 0)) * 100, 1)
        ELSE 0 
    END as budget_usage_percent

FROM public.projects p
LEFT JOIN budget_agg b ON p.id = b.project_id
LEFT JOIN material_agg m ON p.id = m.project_id
LEFT JOIN labor_agg l ON p.id = l.project_id;
