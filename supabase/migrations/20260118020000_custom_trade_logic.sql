-- 1. Modify Organizations Table
-- Drop the existing Check Constraint (we need to find its name or just alter column to drop check if possible, but usually we need to drop constraint by name)
-- Since we defined it inline: CHECK (trade_type IN (...))
-- It usually gets an auto-generated name like organizations_trade_type_check.
-- We can try to DROP CONSTRAINT if exists.

ALTER TABLE "public"."organizations"
DROP CONSTRAINT IF EXISTS "organizations_trade_type_check";

-- Add Custom Trade Name
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "custom_trade_name" text;

-- Add new Constraint (optional, or just allow text)
-- Let's just allow text for flexibility, or re-add constraint with 'custom' included.
-- For maximum flexibility as requested ("Unlimited Trades"), we generally shouldn't constrain it strictly if 'custom' encompasses everything.
-- But the UI uses specific keys. Let's just leave it open-ended or add 'custom' to the list.
-- Decision: No constraint, but defaults to 'general'.

-- 2. Update Switch Function
CREATE OR REPLACE FUNCTION public.fn_switch_org_trade(
    p_org_id uuid,
    p_new_trade text,
    p_reset_inventory boolean DEFAULT false,
    p_custom_name text DEFAULT NULL
) RETURNS void AS $$
BEGIN
    -- Update Org
    UPDATE public.organizations 
    SET 
        trade_type = p_new_trade,
        custom_trade_name = CASE WHEN p_new_trade = 'custom' THEN p_custom_name ELSE NULL END
    WHERE id = p_org_id;

    -- Reset Inventory if requested
    IF p_reset_inventory THEN
        -- Delete existing presets
        DELETE FROM public.stock_presets WHERE organization_id = p_org_id;
        
        -- Re-seed ONLY if standard trade. If custom, we expect user/AI to fill it via frontend calls.
        -- Standard lists:
        IF p_new_trade != 'custom' THEN
            INSERT INTO public.stock_presets (organization_id, name, unit, default_price)
            SELECT 
                p_org_id, 
                item_name, 
                unit, 
                default_price
            FROM public.trade_presets_master
            WHERE trade_type = p_new_trade;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
