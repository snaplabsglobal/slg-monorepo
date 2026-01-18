-- 1. Organizations: Operating Preferences
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "pricing_strategy" JSONB DEFAULT '{
  "current_mode": "balanced",
  "margin_presets": {
    "aggressive": 15,
    "balanced": 25,
    "premium": 40
  },
  "auto_adjust_based_on_history": true
}';

-- 2. Projects: Risk Profiling
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "risk_features" JSONB DEFAULT '[]'::jsonb; -- e.g. ["old_house", "access_limited"]

-- 3. Estimate Items: Risk Factor & Calculation
ALTER TABLE "public"."estimate_items"
ADD COLUMN IF NOT EXISTS "risk_factor" numeric(5,2) DEFAULT 0, -- e.g. 0.10 for 10%
ADD COLUMN IF NOT EXISTS "calculated_total" numeric(15,2) DEFAULT 0;

-- 4. Automation Trigger: Logic First Pricing
CREATE OR REPLACE FUNCTION public.fn_calculate_item_total()
RETURNS TRIGGER AS $$
DECLARE
    project_risk_tags jsonb;
    auto_risk_val numeric := 0;
BEGIN
    -- 1. Fetch Project Risk Features via Estimate
    SELECT p.risk_features INTO project_risk_tags
    FROM public.projects p
    JOIN public.estimates e ON p.id = e.project_id
    WHERE e.id = NEW.estimate_id;

    -- 2. Apply "Old House" Rule (5-10% Risk)
    -- We use 10% (0.10) as the safe default for old houses.
    IF project_risk_tags @> '["old_house"]'::jsonb THEN
        auto_risk_val := 0.10;
    END IF;

    -- 3. Set Risk Factor if not manually overridden (assume 0 is default/unset)
    IF NEW.risk_factor IS NULL OR NEW.risk_factor = 0 THEN
        NEW.risk_factor := auto_risk_val;
    END IF;

    -- 4. Calculate Total Price
    -- Formula: Quantity * UnitCost * (1 + Markup/100) * (1 + RiskFactor)
    -- Note: markup_percent is stored as e.g. 20 (for 20%).
    NEW.calculated_total := 
        (COALESCE(NEW.quantity, 0) * COALESCE(NEW.unit_cost, 0)) * 
        (1 + (COALESCE(NEW.markup_percent, 0) / 100.0)) * 
        (1 + COALESCE(NEW.risk_factor, 0));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_estimate_items_pricing
BEFORE INSERT OR UPDATE ON public.estimate_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_calculate_item_total();
