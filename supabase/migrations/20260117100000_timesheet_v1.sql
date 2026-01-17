-- [1] Structuralize Timecards
ALTER TABLE "public"."timecards"
ADD COLUMN IF NOT EXISTS "start_time" timestamptz,
ADD COLUMN IF NOT EXISTS "end_time" timestamptz,
ADD COLUMN IF NOT EXISTS "is_lunch_provided" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "entry_type" TEXT DEFAULT 'WORK'; -- 'WORK', 'TRAVEL'

-- [2] Trigger to Generate Meal Expense on Approval
CREATE OR REPLACE FUNCTION generate_meal_expense() RETURNS trigger AS $$
DECLARE
    v_meal_rate numeric := 15.00; -- Standard Meal Allowance
    v_org_id uuid;
BEGIN
    -- Only trigger when status changes to 'approved' AND lunch is provided
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.is_lunch_provided = true THEN
        
        -- Get Org ID from Project
        SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
        
        -- Insert into Transactions
        INSERT INTO public.transactions (
            org_id,
            project_id,
            user_id,
            transaction_date,
            total_amount,
            vendor_name,
            description,
            expense_type,
            status,
            category_user
        ) VALUES (
            v_org_id,
            NEW.project_id,
            NEW.employee_id,
            DATE(NEW.created_at), -- Transaction Date = Work Date
            v_meal_rate,
            'Meal Allowance',
            'Auto-generated meal allowance for approved timesheet',
            'business',
            'approved', -- Auto-approved
            'Labor (Meals)'
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_meal_expense ON public.timecards;
CREATE TRIGGER trg_generate_meal_expense
AFTER UPDATE ON public.timecards
FOR EACH ROW
EXECUTE FUNCTION generate_meal_expense();
