-- [1] Enhancing Projects - Geo-Awareness
-- Enable PostGIS if not already enabled (should be, but consistent check)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "geofence" extensions.geography(POLYGON, 4326);

-- Index for fast geo-searches
CREATE INDEX IF NOT EXISTS idx_projects_geofence ON "public"."projects" USING GIST ("geofence");

-- [2] Enhancing Transactions - GPS & Auto-Match Metadata
ALTER TABLE "public"."transactions"
ADD COLUMN IF NOT EXISTS "gps_coordinates" extensions.geography(POINT, 4326),
ADD COLUMN IF NOT EXISTS "project_match_method" TEXT DEFAULT 'MANUAL'; -- 'GPS_AUTO', 'MANUAL', 'AI_INFERRED'

CREATE INDEX IF NOT EXISTS idx_transactions_gps ON "public"."transactions" USING GIST ("gps_coordinates");

-- [3] "The Magic Link": RPC to find project by GPS
CREATE OR REPLACE FUNCTION get_project_by_gps(
    p_lat numeric,
    p_long numeric,
    p_org_id uuid
) RETURNS uuid AS $$
DECLARE
    v_project_id uuid;
BEGIN
    -- Search for a project where the point is within the geofence polygon
    -- AND belongs to the organization (or client org logic if needed, simplify to Org for now)
    SELECT id INTO v_project_id
    FROM public.projects
    WHERE organization_id = p_org_id
      AND status = 'Active'
      AND extensions.ST_Intersects(
          geofence,
          extensions.ST_SetSRID(extensions.ST_MakePoint(p_long, p_lat), 4326)
      )
    LIMIT 1; -- Return the first match. Overlap logic is edge case.

    -- Fallback: If no polygon, maybe distance check from a centroid?
    -- User requested explicit Geofence. Let's stick to strict geofence intersection for accuracy.
    
    RETURN v_project_id;
END;
$$ LANGUAGE plpgsql;

-- [4] Project Financial Summary View (The "Project-First" Data Source)
CREATE OR REPLACE VIEW view_project_financial_summary AS
SELECT 
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.status,
    -- 1. Budget (Sum of Estimates) - Taking the most recent active estimate
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
    
    -- 3. Labor Cost (Timecards) - Assuming simple calculation or stored field
    -- Placeholder: Sum of hours * wage? Need strict join.
    -- For MVP, let's assume 'production_logs' (from prev migration) captures hours, need rate.
    -- Or 'timecards' table. Let's use 'timecards' if exists, or 'production_logs'.
    -- The user requested "Timecards". Let's check schema later. For now, 0 placeholder or Todo.
    0 as total_labor_cost, 
    
    -- 4. Derived
    0 as remaining_budget -- Logic to be computed by client or improved view later
    
FROM public.projects p;

-- [5] "Speedy Profit Warning" Trigger
-- Trigger on Transaction Item insertion. Check CSI code budget vs actual.

CREATE OR REPLACE FUNCTION trigger_verify_budget_health() RETURNS trigger AS $$
DECLARE
    v_project_id uuid;
    v_budget_amount numeric;
    v_actual_spent numeric;
    v_csi_desc TEXT;
    v_org_id uuid;
BEGIN
    -- 1. Get Project ID from Parent Transaction
    SELECT project_id, org_id INTO v_project_id, v_org_id
    FROM public.transactions 
    WHERE id = NEW.transaction_id;

    IF v_project_id IS NULL THEN RETURN NEW; END IF;

    -- 2. Get Budget for this CSI Code (Marked as Sold Estimate)
    -- Using the 'active_cost_benchmark' or straight table query
    SELECT SUM(ei.quantity * ei.unit_cost_snapshot) -- Simplified calc snapshot
    INTO v_budget_amount
    FROM public.estimate_items ei
    JOIN public.estimates e ON ei.estimate_id = e.id
    WHERE e.project_id = v_project_id 
      AND e.status = 'Marked as Sold'
      AND ei.csi_code = NEW.csi_code;
      
    IF v_budget_amount IS NULL OR v_budget_amount = 0 THEN RETURN NEW; END IF;

    -- 3. Get Total Spent for this CSI Code (Including this new item)
    SELECT SUM(ti.amount)
    INTO v_actual_spent
    FROM public.transaction_items ti
    JOIN public.transactions t ON ti.transaction_id = t.id
    WHERE t.project_id = v_project_id 
      AND ti.csi_code = NEW.csi_code;
      
    -- 4. Compare & Alert
    -- Threshold: > 90% of budget? or > 100%?
    -- User request: "If budget $2000, spent $1800 (90%) -> Alert"
    IF v_actual_spent >= (v_budget_amount * 0.9) THEN
        -- Check if alert already exists to avoid spam? 
        -- For MVP, Insert Warning.
        
        -- Get CSI Description for nicer message
        SELECT description INTO v_csi_desc FROM public.csi_codes WHERE code = NEW.csi_code;

        INSERT INTO public.construction_alerts (
            project_id, 
            alert_type, 
            title, 
            message, 
            severity,
            variance_percentage -- Reusing this field for % usage
        ) VALUES (
            v_project_id, 
            'Budget Risk', 
            'Profit Warning: ' || COALESCE(v_csi_desc, NEW.csi_code),
            format('Spent $%.2f of $%.2f Budget (%.0f%%). Risk of overage.', v_actual_spent, v_budget_amount, (v_actual_spent/v_budget_amount)*100),
            'warning',
            (v_actual_spent/v_budget_amount)*100
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_health ON public.transaction_items;
CREATE TRIGGER trg_budget_health
AFTER INSERT ON public.transaction_items
FOR EACH ROW
EXECUTE FUNCTION trigger_verify_budget_health();
