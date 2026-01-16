-- [1] Production Logs (The "Field Truth")
-- Daily logs where workers record "What I actually did" (Quantity) vs "How long it took" (Hours).
CREATE TABLE IF NOT EXISTS "public"."production_logs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES "public"."projects"("id"),
    "user_id" uuid REFERENCES auth.users("id"),
    "csi_code" TEXT REFERENCES "public"."csi_codes"("code"), -- Link to the activity
    "date" date DEFAULT CURRENT_DATE,
    "quantity_completed" numeric(10,2) NOT NULL, -- e.g. 80 LF
    "unit" TEXT, -- e.g. LF
    "hours_spent" numeric(5,2) NOT NULL, -- e.g. 16.0
    "notes" TEXT,
    "created_at" timestamptz DEFAULT now()
);

-- [2] Construction Alerts (The "Smart Warning")
-- Stores system-generated alerts when variance exceeds thresholds.
CREATE TABLE IF NOT EXISTS "public"."construction_alerts" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES "public"."projects"("id"),
    "user_id" uuid REFERENCES auth.users("id"), -- Who triggered it or who it is assigned to
    "title" TEXT,
    "message" TEXT,
    "alert_type" TEXT, -- 'Productivity Variance', 'Safety', 'Budget'
    "severity" TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    "variance_percentage" numeric(6,2), -- e.g. 25.00 for 25% overrun
    "is_resolved" BOOLEAN DEFAULT false,
    "created_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."production_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."construction_alerts" ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own logs" ON "public"."production_logs" USING (auth.uid() = user_id);
CREATE POLICY "Admins view all logs" ON "public"."production_logs" USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.role IN ('Owner', 'Admin'))
);
-- Allow insert
CREATE POLICY "Users insert logs" ON "public"."production_logs" FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view relevant alerts" ON "public"."construction_alerts" USING (auth.uid() = user_id);
CREATE POLICY "Admins view all alerts" ON "public"."construction_alerts" USING (
    EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.role IN ('Owner', 'Admin'))
);

-- [3] The "Snap-Jarvis" Logic (Variance Analysis Trigger)
-- Triggered after a log is inserted.
CREATE OR REPLACE FUNCTION trigger_analyze_variance() RETURNS trigger AS $$
DECLARE
    v_target_productivity numeric;
    v_actual_productivity numeric; -- Unit/Hr
    v_target_hr_per_unit numeric;  -- Hr/Unit (Inverse for intuitive cost comparison)
    v_actual_hr_per_unit numeric;
    v_variance_percent numeric;
    v_unit_rate_id uuid;
    v_severity TEXT := 'info';
    v_msg TEXT;
    v_org_id uuid;
BEGIN
    -- 0. Find the Unit Rate (Standard) for this Item/Org
    -- Need to find Org via Project
    SELECT organization_id INTO v_org_id FROM public.projects WHERE id = NEW.project_id;
    
    SELECT productivity_rate INTO v_target_productivity
    FROM public.unit_rates
    WHERE csi_code = NEW.csi_code 
      AND org_id = v_org_id
    LIMIT 1;

    -- If no standard found, cannot compare. Exit.
    IF v_target_productivity IS NULL OR v_target_productivity = 0 THEN
        RETURN NEW;
    END IF;

    -- 1. Calculate Actuals
    -- Avoid div by zero
    IF NEW.quantity_completed = 0 THEN
         RETURN NEW;
    END IF;
    
    -- Actual Productivity (Units/Hr) e.g. 80LF / 16hr = 5 LF/Hr
    v_actual_productivity := NEW.quantity_completed / NEW.hours_spent;

    -- 2. Compare (using Hr/Unit is often safer for cost logic, but Units/Hr is standard in DB)
    -- Target: 40 LF/Hr. Actual: 5 LF/Hr. -> Way slow.
    -- Variance in Cost/Effort = (TargetProd - ActualProd) ... 
    -- Let's use Cost Variance %: (Actual Time - Estimated Time) / Estimated Time
    -- Est Time = Qty / TargetProd = 80 / 40 = 2 Hrs.
    -- Act Time = 16 Hrs.
    -- Variance = (16 - 2) / 2 = 700% Overrun!
    
    -- Let's use the user's example: 
    -- Act: 16hrs/80LF = 0.2 hr/LF.
    -- Est: 16hrs/100LF (implied standard) = 0.16 hr/LF.
    -- Var: (0.2 - 0.16)/0.16 = 25%.
    
    v_actual_hr_per_unit := NEW.hours_spent / NEW.quantity_completed;
    v_target_hr_per_unit := 1.0 / v_target_productivity;
    
    v_variance_percent := ((v_actual_hr_per_unit - v_target_hr_per_unit) / v_target_hr_per_unit) * 100;
    
    -- 3. Check Thresholds (e.g. > 15%)
    IF v_variance_percent > 15 THEN
        v_severity := 'warning';
        IF v_variance_percent > 25 THEN
            v_severity := 'critical';
        END IF;

        v_msg := format('Efficiency Alert: Actual %.2f hr/%s vs Standard %.2f hr/%s. (+%s%% Labor Cost). Check site conditions.', 
                        v_actual_hr_per_unit, NEW.unit, v_target_hr_per_unit, NEW.unit, ROUND(v_variance_percent, 0));

        INSERT INTO public.construction_alerts (
            project_id, user_id, title, message, alert_type, severity, variance_percentage
        ) VALUES (
            NEW.project_id, 
            NEW.user_id, 
            'Low Productivity Detected',
            v_msg,
            'Productivity Variance',
            v_severity,
            v_variance_percent
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Bind Trigger
DROP TRIGGER IF EXISTS trg_productivity_feedback ON public.production_logs;
CREATE TRIGGER trg_productivity_feedback
AFTER INSERT ON public.production_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_analyze_variance();
