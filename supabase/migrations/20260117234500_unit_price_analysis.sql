-- 1. Unit Recipes (Material Consumption Logic)
CREATE TABLE IF NOT EXISTS "public"."unit_recipes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" REFERENCES "public"."organizations"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL, -- e.g. "Standard 2x4 Wall 16oc"
    "base_unit" "text" NOT NULL, -- e.g. "lf" (Linear Foot), "sqft"
    "components" "jsonb" NOT NULL DEFAULT '[]'::jsonb, 
    -- e.g. [{ "item_name": "2x4 Stud", "qty_per_unit": 1.5 }, { "item_name": "Drywall Screw", "qty_per_unit": 12 }]
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- 2. RLS for Recipes
ALTER TABLE "public"."unit_recipes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view recipes" ON "public"."unit_recipes"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM organization_members 
        WHERE organization_members.organization_id = unit_recipes.organization_id 
        AND organization_members.user_id = auth.uid()
    )
);

-- 3. View: Realized Unit Cost Performance
-- Aggregates Actual Spend (Transactions) vs Estimated Quantity (Estimates)
-- Joined by Project + Category
CREATE OR REPLACE VIEW "public"."view_realized_unit_performance" AS
WITH actuals AS (
    -- Sum expenses by Project and Category
    -- Note: transactions must have a 'category' field. 
    -- If not present in your schema, we might match via description or assume it exists. 
    -- Based on user request, let's assume 'category' exists or map 'cost_code'.
    SELECT 
        project_id,
        category, 
        SUM(total_amount) as total_actual_cost
    FROM transactions
    WHERE direction = 'expense' AND status != 'void'
    GROUP BY project_id, category
),
estimates AS (
    -- Sum quantities and estimated costs by Project and Category
    SELECT 
        e.project_id,
        ei.category,
        SUM(ei.quantity) as total_estimated_qty,
        SUM(ei.calculated_total) as total_estimated_cost
    FROM estimates e
    JOIN estimate_items ei ON e.id = ei.estimate_id
    WHERE e.status = 'Marked as Sold' -- Only count sold estimates
    GROUP BY e.project_id, ei.category
)
SELECT 
    e.project_id,
    e.category,
    
    e.total_estimated_qty,
    e.total_estimated_cost,
    
    COALESCE(a.total_actual_cost, 0) as total_actual_cost,
    
    -- Estimated Unit Price
    CASE 
        WHEN e.total_estimated_qty > 0 THEN ROUND(e.total_estimated_cost / e.total_estimated_qty, 2)
        ELSE 0 
    END as estimated_unit_price,
    
    -- Realized Unit Price
    CASE 
        WHEN e.total_estimated_qty > 0 THEN ROUND(COALESCE(a.total_actual_cost, 0) / e.total_estimated_qty, 2)
        ELSE 0 
    END as realized_unit_price,
    
    -- Variance Amount per Unit
    CASE 
        WHEN e.total_estimated_qty > 0 THEN 
            ROUND((COALESCE(a.total_actual_cost, 0) / e.total_estimated_qty) - (e.total_estimated_cost / e.total_estimated_qty), 2)
        ELSE 0 
    END as unit_variance,
    
    -- Variance Percent
    CASE 
        WHEN e.total_estimated_cost > 0 THEN 
            ROUND(((COALESCE(a.total_actual_cost, 0) - e.total_estimated_cost) / e.total_estimated_cost) * 100, 1)
        ELSE 0 
    END as variance_percent

FROM estimates e
LEFT JOIN actuals a ON e.project_id = a.project_id AND e.category = a.category;
