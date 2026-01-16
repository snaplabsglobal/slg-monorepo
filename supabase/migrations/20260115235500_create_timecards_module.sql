-- [1] Create Timecards Table
CREATE TABLE IF NOT EXISTS "public"."timecards" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "employee_id" uuid REFERENCES auth.users(id), -- As requested, linking to auth.users
    "project_id" uuid REFERENCES public.projects(id),
    "clock_in_at" timestamptz DEFAULT now(),
    "clock_out_at" timestamptz,
    "total_hours" numeric(5,2),
    
    -- Privacy & Audit Fields
    "is_in_bounds_at_start" BOOLEAN, -- Was inside geofence at start
    "is_in_bounds_at_end" BOOLEAN,   -- Was inside geofence at end
    "gps_metadata" jsonb,            -- Encrypted/Sensitive GPS data (lat/lng snapshots)
    
    "status" TEXT DEFAULT 'pending', -- pending, approved, paid
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- [2] Hours Calculation Function
CREATE OR REPLACE FUNCTION calculate_hours() RETURNS trigger AS $$
BEGIN
  IF NEW.clock_out_at IS NOT NULL THEN
    -- Calculate difference in hours
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_at - NEW.clock_in_at)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [3] Bind Trigger
DROP TRIGGER IF EXISTS trigger_calculate_hours ON public.timecards;
CREATE TRIGGER trigger_calculate_hours
BEFORE INSERT OR UPDATE ON public.timecards
FOR EACH ROW
EXECUTE FUNCTION calculate_hours();
