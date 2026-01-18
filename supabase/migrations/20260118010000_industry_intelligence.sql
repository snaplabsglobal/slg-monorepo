-- 1. Master Trade Presets Table
CREATE TABLE IF NOT EXISTS "public"."trade_presets_master" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "trade_type" text NOT NULL,
    "item_name" text NOT NULL,
    "unit" text DEFAULT 'ea',
    "default_price" numeric DEFAULT 0,
    "created_at" timestamptz DEFAULT now()
);

-- Note: We do not need RLS for this table if it's purely a reference for the system (or read-only for auth users)
ALTER TABLE "public"."trade_presets_master" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can read master presets" ON "public"."trade_presets_master" FOR SELECT USING (true);

-- 2. Seed Master Data
INSERT INTO "public"."trade_presets_master" (trade_type, item_name, unit, default_price) VALUES
-- General
('general', '2x4 Stud (8ft)', 'ea', 4.50),
('general', 'Drywall Sheet (4x8)', 'sht', 15.00),
('general', 'Construction Screw (1lb)', 'box', 8.99),
('general', 'Duct Tape', 'roll', 6.50),
('general', 'Utility Knife Blades', 'pk', 3.00),

-- Electrician
('electrician', '14/2 Romex Wire', 'ft', 0.80),
('electrician', 'Outlet Box (Plastic)', 'ea', 2.50),
('electrician', 'Wire Nuts (100pk)', 'bag', 12.00),
('electrician', 'Electrical Tape', 'roll', 3.00),
('electrician', '15A Circuit Breaker', 'ea', 7.50),

-- Plumber
('plumber', '1/2" Copper Pipe', 'ft', 2.50),
('plumber', '1/2" Elbow 90', 'ea', 0.85),
('plumber', 'Teflon Tape', 'roll', 1.50),
('plumber', 'Flux & Solder Kit', 'kit', 18.00),
('plumber', 'PVC Glue (Clear)', 'can', 5.50),

-- HVAC
('hvac', 'R410A Freon', 'lb', 25.00),
('hvac', 'Air Filter (20x20x1)', 'ea', 6.00),
('hvac', 'Foil Tape', 'roll', 12.00),
('hvac', 'Flex Duct (6")', 'ft', 1.20);


-- 3. Update Seeding Function to use Master Table
CREATE OR REPLACE FUNCTION public.fn_seed_industry_presets()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.stock_presets (organization_id, name, unit, default_price)
    SELECT 
        NEW.id, 
        item_name, 
        unit, 
        default_price
    FROM public.trade_presets_master
    WHERE trade_type = NEW.trade_type;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Function to Switch Trade
CREATE OR REPLACE FUNCTION public.fn_switch_org_trade(
    p_org_id uuid,
    p_new_trade text,
    p_reset_inventory boolean DEFAULT false
) RETURNS void AS $$
BEGIN
    -- Update Org
    UPDATE public.organizations 
    SET trade_type = p_new_trade
    WHERE id = p_org_id;

    -- Reset Inventory if requested
    IF p_reset_inventory THEN
        -- Delete existing presets (maybe only those that match master list to avoid deleting user customs? For MVP, delete all)
        DELETE FROM public.stock_presets WHERE organization_id = p_org_id;
        
        -- Re-seed
        INSERT INTO public.stock_presets (organization_id, name, unit, default_price)
        SELECT 
            p_org_id, 
            item_name, 
            unit, 
            default_price
        FROM public.trade_presets_master
        WHERE trade_type = p_new_trade;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
