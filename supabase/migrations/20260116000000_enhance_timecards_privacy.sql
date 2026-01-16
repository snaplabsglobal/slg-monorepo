-- [0] Set search path for PostGIS types
SET search_path = public, extensions;

-- [1] Add Privacy & Audit Fields
ALTER TABLE public.timecards 
ADD COLUMN IF NOT EXISTS "check_in_location" geography(POINT), -- Encrypted/Sensitive location for audit
ADD COLUMN IF NOT EXISTS "device_info" JSONB,                  -- Device ID/User Agent to prevent proxy punching
ADD COLUMN IF NOT EXISTS "privacy_consent_version" TEXT,       -- Version of privacy policy consented to
ADD COLUMN IF NOT EXISTS "check_in_photo_url" TEXT;            -- URL to R2 photo evidence

-- [2] Enable RLS
ALTER TABLE public.timecards ENABLE ROW LEVEL SECURITY;

-- [3] RLS Policies

-- Policy: Employees can view their own timecards
DROP POLICY IF EXISTS "Employees can view own timecards" ON public.timecards;
CREATE POLICY "Employees can view own timecards" ON public.timecards
FOR SELECT USING (auth.uid() = employee_id);

-- Policy: Employees can insert their own timecards (Clock In)
DROP POLICY IF EXISTS "Employees can insert own timecards" ON public.timecards;
CREATE POLICY "Employees can insert own timecards" ON public.timecards
FOR INSERT WITH CHECK (auth.uid() = employee_id);

-- Policy: Employees can update their own timecards (Clock Out - limited scope ideally, but for now allow own update)
-- Refinement: In strict systems, clock-out might be an UPDATE where id matches.
DROP POLICY IF EXISTS "Employees can update own timecards" ON public.timecards;
CREATE POLICY "Employees can update own timecards" ON public.timecards
FOR UPDATE USING (auth.uid() = employee_id);

-- Policy: Admins/PMs can view all timecards in their organization (assuming org context or broad permission)
-- The user request specified: "Admins can view all timecards in project". 
-- This implies checking if the admin has access to the project OR just role-based global access.
-- The provided SQL was:
-- EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'pm'))
-- This is a simple role check. We will implement as requested.

-- Policy: Admins/PMs can view all timecards in their organization
-- Fixed: logic to look up role in organization_members via projects
DROP POLICY IF EXISTS "Admins can view all timecards in project" ON public.timecards;
CREATE POLICY "Admins can view all timecards in project" ON public.timecards
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om
    JOIN public.projects p ON p.organization_id = om.organization_id
    WHERE p.id = timecards.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin') -- Mapping 'pm' to 'Admin' or 'Owner' as 'pm' does not exist in constraint
  )
);
