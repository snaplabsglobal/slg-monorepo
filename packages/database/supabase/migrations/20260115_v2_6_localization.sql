-- Migration: Localization & Timezones (v2.6)
-- Timestamp: 20260115000002

BEGIN;

-- 1. Organization Defaults
DO $$
BEGIN
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS default_language TEXT DEFAULT 'en'; -- en, zh, es
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Vancouver';
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'CAD';
    
    COMMENT ON COLUMN public.organizations.timezone IS 'Base timezone for reporting and payroll';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. User Profile Preferences (Overrides Org)
DO $$
BEGIN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Vancouver';
    
    COMMENT ON COLUMN public.profiles.preferred_language IS 'User interface language preference';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Transaction Meta
DO $$
BEGIN
    ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS original_language TEXT;
EXCEPTION WHEN others THEN NULL;
END $$;

COMMIT;
