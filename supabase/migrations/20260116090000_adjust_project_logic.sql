-- [1] Hourly Wage for Labor Calculation
ALTER TABLE "public"."organization_members"
ADD COLUMN IF NOT EXISTS "hourly_wage" numeric(10,2) DEFAULT 0;

-- [2] RPC: Active Project Quick Select
-- Returns top 3 projects with recent activity for the user (Transactions or Timecards)
CREATE OR REPLACE FUNCTION get_recent_active_projects(p_user_id uuid)
RETURNS TABLE (
    project_id uuid,
    project_name text,
    project_address text,
    match_score bigint -- simple frequency/recency score
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_activity AS (
        -- Recent Transactions
        SELECT t.project_id, t.created_at
        FROM public.transactions t
        WHERE t.user_id = p_user_id 
          AND t.project_id IS NOT NULL
          AND t.created_at > now() - interval '30 days'
        
        UNION ALL
        
        -- Recent Timecards
        SELECT tc.project_id, tc.created_at
        FROM public.timecards tc
        WHERE tc.employee_id = p_user_id
          AND tc.project_id IS NOT NULL
          AND tc.created_at > now() - interval '30 days'
    )
    SELECT 
        p.id, 
        p.name, 
        p.address, 
        COUNT(*) as score
    FROM recent_activity ra
    JOIN public.projects p ON p.id = ra.project_id
    GROUP BY p.id, p.name, p.address
    ORDER BY score DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- [3] Update Financial View with Real Labor Cost
-- Replacing the placeholder 0 with actual calculation: Sum(Hours * Wage)
-- Wage is stored in organization_members. We need to join via user_id and org_id.

DROP VIEW IF EXISTS view_project_financial_summary;

CREATE OR REPLACE VIEW view_project_financial_summary AS
SELECT 
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.status,
    -- 1. Budget (Sum of Estimates)
    COALESCE((
        SELECT SUM(ei.final_line_price) 
        FROM public.estimates e 
        JOIN public.view_estimate_final_pricing ei ON ei.estimate_id = e.id 
        WHERE e.project_id = p.id AND e.status = 'Marked as Sold'
    ), 0) as total_budget,
    
    -- 2. Spent (Transactions)
    COALESCE((
        SELECT SUM(t.total_amount)
        FROM public.transactions t
        WHERE t.project_id = p.id
    ), 0) as total_spent_materials,
    
    -- 3. Labor Cost (Timecards * Wage)
    -- Join Timecards -> Org Member (to get wage)
    -- Note: This uses CURRENT wage. Historic wage tracking would require a separate table, but this is MVP.
    COALESCE((
        SELECT SUM(
            COALESCE(tc.total_hours, 0) * COALESCE(om.hourly_wage, 0)
        )
        FROM public.timecards tc
        JOIN public.organization_members om ON om.user_id = tc.employee_id 
                                           AND om.organization_id = p.organization_id
        WHERE tc.project_id = p.id
    ), 0) as total_labor_cost, 
    
    -- 4. Derived (Placeholder for frontend calc usually, but added here)
    0 as remaining_budget
    
FROM public.projects p;
