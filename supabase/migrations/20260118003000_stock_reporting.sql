-- 1. Add Trade Type to Organizations
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "trade_type" text DEFAULT 'general'
CHECK (trade_type IN ('general', 'electrician', 'plumber', 'hvac', 'carpenter'));

-- 2. Create Stock Presets Table
CREATE TABLE IF NOT EXISTS "public"."stock_presets" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "organization_id" uuid REFERENCES "public"."organizations" ON DELETE CASCADE NOT NULL,
    "name" text NOT NULL,
    "unit" text DEFAULT 'ea',
    "default_price" numeric DEFAULT 0,
    "created_at" timestamptz DEFAULT now()
);

-- RLS for stock_presets
ALTER TABLE "public"."stock_presets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org presets" ON "public"."stock_presets"
    FOR SELECT USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage their org presets" ON "public"."stock_presets"
    FOR ALL USING (organization_id IN (
        SELECT organization_id FROM profiles WHERE id = auth.uid()
    ));

-- 3. Seeding Logic (Trigger)
CREATE OR REPLACE FUNCTION public.fn_seed_industry_presets()
RETURNS trigger AS $$
BEGIN
    -- General Defaults
    IF NEW.trade_type = 'general' THEN
        INSERT INTO public.stock_presets (organization_id, name, unit, default_price) VALUES
        (NEW.id, '2x4 Stud (8ft)', 'ea', 4.50),
        (NEW.id, 'Drywall Sheet (4x8)', 'sht', 15.00),
        (NEW.id, 'Construction Screw (1lb)', 'box', 8.99),
        (NEW.id, 'Duct Tape', 'roll', 6.50);
    
    ELSIF NEW.trade_type = 'electrician' THEN
        INSERT INTO public.stock_presets (organization_id, name, unit, default_price) VALUES
        (NEW.id, '14/2 Romex Wire', 'ft', 0.80),
        (NEW.id, 'Outlet Box (Plastic)', 'ea', 2.50),
        (NEW.id, 'Wire Nuts (100pk)', 'bag', 12.00),
        (NEW.id, 'Electrical Tape', 'roll', 3.00);

    ELSIF NEW.trade_type = 'plumber' THEN
        INSERT INTO public.stock_presets (organization_id, name, unit, default_price) VALUES
        (NEW.id, '1/2" Copper Pipe', 'ft', 2.50),
        (NEW.id, '1/2" Elbow 90', 'ea', 0.85),
        (NEW.id, 'Teflon Tape', 'roll', 1.50),
        (NEW.id, 'Flux & Solder Kit', 'kit', 18.00);
    
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on Org Creation
DROP TRIGGER IF EXISTS tr_init_industry_presets ON public.organizations;
CREATE TRIGGER tr_init_industry_presets
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.fn_seed_industry_presets();

-- 4. Update Financial View (Cash vs Stock)
CREATE OR REPLACE VIEW view_project_financial_summary AS
WITH budget_agg AS (
    SELECT 
        e.project_id, 
        SUM(ei.quantity * COALESCE(ei.unit_price, 0)) as total_budget
    FROM public.estimates e 
    JOIN public.estimate_items ei ON e.id = ei.estimate_id 
    WHERE e.status = 'Marked as Sold'
    GROUP BY e.project_id
),
transaction_agg AS (
    SELECT 
        t.project_id,
        -- Cash Scale: Real money leaving bank (Card, Cash, Invoice/Bill)
        SUM(CASE WHEN t.expense_type IN ('card', 'cash', 'invoice') THEN t.total_amount ELSE 0 END) as total_cash_spent,
        -- Stock Scale: Internal inventory consumption (Virtual cost)
        SUM(CASE WHEN t.expense_type = 'internal_stock' THEN t.total_amount ELSE 0 END) as total_stock_value,
        -- Total Cost for Profit Calculation
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
    
    COALESCE(b.total_budget, 0) as total_budget,
    COALESCE(m.total_cash_spent, 0) as total_cash_spent,
    COALESCE(m.total_stock_value, 0) as total_stock_value,
    COALESCE(m.total_spent_materials, 0) as total_spent_materials,
    COALESCE(l.total_labor_cost, 0) as total_labor_cost,
    
    -- Derived Total Cost (Material + Labor)
    (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) as total_spent,
    
    -- Remaining Profit (Budget - Total Cost)
    (COALESCE(b.total_budget, 0) - (COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0))) as remaining_profit,
    
    -- Budget Usage %
    CASE 
        WHEN COALESCE(b.total_budget, 0) > 0 THEN 
            ROUND(((COALESCE(m.total_spent_materials, 0) + COALESCE(l.total_labor_cost, 0)) / COALESCE(b.total_budget, 0)) * 100, 1)
        ELSE 0 
    END as budget_usage_percent
    
FROM public.projects p
LEFT JOIN budget_agg b ON p.id = b.project_id
LEFT JOIN transaction_agg m ON p.id = m.project_id
LEFT JOIN labor_agg l ON p.id = l.project_id;
