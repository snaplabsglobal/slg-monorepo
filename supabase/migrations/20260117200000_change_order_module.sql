-- [1] Schema Update for Timeline Data
ALTER TABLE "public"."change_orders"
ADD COLUMN IF NOT EXISTS "impact_days" integer DEFAULT 0;

-- [2] Update Financial View to include Approved COs
CREATE OR REPLACE VIEW view_project_financial_summary AS
WITH budget_agg AS (
    -- Sum of all 'Marked as Sold' estimates
    SELECT 
        e.project_id,
        SUM(ei.quantity * COALESCE(ei.unit_price, 0)) as total_original_budget
    FROM public.estimates e
    JOIN public.estimate_items ei ON e.id = ei.estimate_id
    WHERE e.status = 'Marked as Sold'
    GROUP BY e.project_id
),
change_order_agg AS (
    -- Sum of Approved Change Orders
    SELECT 
        co.project_id,
        SUM(co.amount_change) as total_change_order_cost,
        SUM(co.impact_days) as total_delay_days
    FROM public.change_orders co
    WHERE co.status = 'approved'
    GROUP BY co.project_id
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
    
    -- Budget Calculation
    COALESCE(b.total_original_budget, 0) as original_budget,
    COALESCE(co.total_change_order_cost, 0) as change_order_cost,
    (COALESCE(b.total_original_budget, 0) + COALESCE(co.total_change_order_cost, 0)) as total_budget,
    
    -- Spent
    COALESCE(m.total_spent_materials, 0) as total_spent_materials,
    COALESCE(l.total_labor_cost, 0) as total_labor_cost,
    (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) as total_spent,
    
    -- Profit
    ((COALESCE(b.total_original_budget, 0) + COALESCE(co.total_change_order_cost, 0)) - 
     (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0))) as remaining_profit,
    
    -- Stats
    CASE 
        WHEN (COALESCE(b.total_original_budget, 0) + COALESCE(co.total_change_order_cost, 0)) > 0 THEN 
            ROUND(((COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) / 
            (COALESCE(b.total_original_budget, 0) + COALESCE(co.total_change_order_cost, 0))) * 100, 1)
        ELSE 0 
    END as budget_usage_percent,
    
    COALESCE(co.total_delay_days, 0) as total_project_delay_days

FROM public.projects p
LEFT JOIN budget_agg b ON p.id = b.project_id
LEFT JOIN change_order_agg co ON p.id = co.project_id
LEFT JOIN material_agg m ON p.id = m.project_id
LEFT JOIN labor_agg l ON p.id = l.project_id;
