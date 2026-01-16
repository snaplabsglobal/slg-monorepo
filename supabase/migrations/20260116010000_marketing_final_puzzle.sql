-- [1] Update Project Status Constraint to include 'signed'
-- We must drop the constraint and recreate it to add a new enum value (essentially)
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['Active', 'Archived', 'signed'])); -- Lowercase 'signed' as per user request trigger logic

-- [2] Trigger Function for Referral Conversion
CREATE OR REPLACE FUNCTION trigger_referral_reward() RETURNS trigger AS $$
BEGIN
  -- Logic: When project becomes 'signed' (Contract Signed)
  -- We need to find if there is a pending referral for this client.
  -- Strategy: 
  -- 1. Get Client Email from the Client Org ID linked to the project.
  --    (Assumption: Organization -> Owner -> Email)
  -- 2. Update 'referrals' table where referred_email matches.
  
  IF NEW.status = 'signed' AND (OLD.status IS DISTINCT FROM 'signed') THEN
    UPDATE public.referrals 
    SET status = 'converted'
    WHERE status = 'pending' 
      AND referred_email IN (
          SELECT p.email
          FROM public.organization_members om
          JOIN public.profiles p ON om.user_id = p.id
          WHERE om.organization_id = NEW.client_org_id
            AND om.role = 'Owner'
      );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- [3] Bind Trigger
DROP TRIGGER IF EXISTS trigger_referral_reward_check ON public.projects;
CREATE TRIGGER trigger_referral_reward_check
AFTER UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION trigger_referral_reward();
