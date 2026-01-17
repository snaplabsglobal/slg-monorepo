CREATE OR REPLACE FUNCTION generate_meal_expense() RETURNS trigger AS $$
DECLARE
    v_meal_rate numeric := 15.00;
    v_org_id uuid;
BEGIN
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') AND NEW.is_lunch_provided = true THEN
        
        -- Get Org ID
        SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
        
        -- Insert into Transactions
        INSERT INTO public.transactions (
            org_id,
            project_id,
            user_id,
            transaction_date, -- FIXED: Use start_time for accurate accounting
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
            DATE(NEW.start_time), -- <--- CHANGED FROM created_at
            v_meal_rate,
            'Meal Allowance',
            'Auto-generated meal allowance',
            'business',
            'approved',
            'Labor (Meals)'
        );
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
