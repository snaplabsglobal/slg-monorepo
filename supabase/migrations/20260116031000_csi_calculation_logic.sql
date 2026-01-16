-- [1] Core Calculation Function
-- Formula: ((Material * Waste) + (1/Productivity * Wage) + Equipment + (Sub * Markup)) * Loc * Complex * GlobalMarkup

CREATE OR REPLACE FUNCTION calculate_estimate_item_price(
    p_quantity numeric,
    p_material_net numeric,
    p_waste_factor numeric,
    p_productivity_rate numeric, -- units/hr
    p_wage_rate numeric,         -- $/hr
    p_equipment_rate numeric,
    p_sub_rate numeric,          -- Base sub rate if any
    p_sub_markup numeric,
    p_loc_factor numeric,
    p_complex_factor numeric,
    p_global_markup numeric
) RETURNS numeric AS $$
DECLARE
    v_unit_labor_cost numeric;
    v_unit_material_cost numeric;
    v_total_unit_cost numeric;
BEGIN
    -- 1. Labor Cost per Unit
    -- If productivity is 0 or null, assume 0 labor cost (avoid div by zero)
    IF p_productivity_rate IS NULL OR p_productivity_rate = 0 THEN
        v_unit_labor_cost := 0;
    ELSE
        v_unit_labor_cost := (1 / p_productivity_rate) * p_wage_rate;
    END IF;

    -- 2. Material Cost per Unit (with Waste)
    v_unit_material_cost := p_material_net * COALESCE(p_waste_factor, 1.0);

    -- 3. Total Base Unit Cost (Mat + Lab + Eq + Sub)
    v_total_unit_cost := v_unit_material_cost 
                       + v_unit_labor_cost 
                       + COALESCE(p_equipment_rate, 0) 
                       + (COALESCE(p_sub_rate, 0) * COALESCE(p_sub_markup, 1.0));
    
    -- 4. Apply Global Factors
    RETURN v_total_unit_cost * p_quantity * p_loc_factor * p_complex_factor * p_global_markup;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- [2] Trigger to Auto-Calculate on Insert/Update of Estimate Items
-- When an item is added, we grab the Unit Rate snapshot (if not provided) or use existing,
-- Then pull Estimate Factors and calculate final price.
-- NOTE: For this architecture, we will create a View or Generated Column for the final price, 
-- but a Trigger is good to populate 'snapshot' values if they are null.

CREATE OR REPLACE FUNCTION trigger_hydrate_estimate_item() RETURNS trigger AS $$
DECLARE
    v_loc_factor numeric;
    v_complex_factor numeric;
    v_global_markup numeric;
    v_ur record; -- Unit Rate record
BEGIN
    -- 0. Fetch Estimate Factors
    SELECT location_factor, complexity_factor, global_markup_percent
    INTO v_loc_factor, v_complex_factor, v_global_markup
    FROM public.estimates
    WHERE id = NEW.estimate_id;

    -- 1. If Snapshots are missing, try to fetch from Unit Rates (Cost Book)
    -- This allows "Hydrating" an estimate item just by passing a csi_code
    IF NEW.unit_cost_snapshot IS NULL AND NEW.csi_code IS NOT NULL THEN
        -- Find the Unit Rate for this Org (Assumption: Link via user or context? 
        -- Limitation: Trigger doesn't know auth.uid easily without helper.
        -- Strategy: Find Unit Rate that matches the Estimate's Project Org.)
        
        SELECT ur.*
        INTO v_ur
        FROM public.unit_rates ur
        JOIN public.estimates e ON e.id = NEW.estimate_id
        JOIN public.projects p ON p.id = e.project_id
        WHERE ur.csi_code = NEW.csi_code
          AND ur.org_id = p.organization_id -- Match Org
        LIMIT 1;
        
        IF FOUND THEN
             -- Calculate Base Unit Cost Snapshot (Before Global Factors)
             -- We store a single 'unit_cost_snapshot' for simplicity in schema, 
             -- or we could expand schema to store broken down snapshots.
             -- User schema asked for "unit_cost_snapshot".
             
             -- Let's calc the "Base Unit Price" (Mat+Lab+Eq+Sub) without global markup
             -- Reuse logic inline or just calc
             
             DECLARE
                 v_lab numeric := 0;
                 v_mat numeric := v_ur.material_cost_net * COALESCE(v_ur.waste_factor, 1.0);
                 v_eq numeric := COALESCE(v_ur.equipment_rate, 0);
             BEGIN
                 IF v_ur.productivity_rate > 0 THEN
                    v_lab := (1 / v_ur.productivity_rate) * v_ur.wage_rate;
                 END IF;
                 
                 NEW.unit_cost_snapshot := v_mat + v_lab + v_eq; -- Base Cost
                 NEW.description := COALESCE(NEW.description, v_ur.item_name);
                 NEW.unit := COALESCE(NEW.unit, v_ur.unit);
             END;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_hydrate_est_item ON public.estimate_items;
CREATE TRIGGER trg_hydrate_est_item
BEFORE INSERT OR UPDATE ON public.estimate_items
FOR EACH ROW
EXECUTE FUNCTION trigger_hydrate_estimate_item();

-- [3] Final Calculation View (The "Answer")
CREATE OR REPLACE VIEW public.view_estimate_final_pricing AS
SELECT
    ei.id as item_id,
    ei.estimate_id,
    ei.description,
    ei.quantity,
    ei.unit_cost_snapshot as base_unit_cost,
    e.location_factor,
    e.complexity_factor,
    e.global_markup_percent,
    
    -- The Formula
    ROUND(
        (ei.unit_cost_snapshot * ei.quantity) * 
        e.location_factor * 
        e.complexity_factor * 
        e.global_markup_percent
    , 2) as final_line_price
    
FROM public.estimate_items ei
JOIN public.estimates e ON ei.estimate_id = e.id;
