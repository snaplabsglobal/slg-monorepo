-- Migration: Home Hero & Ecosystem Final (v2.4)
-- Timestamp: 20260115000000

BEGIN;

-- 1. Organizations Enhancements (User Tiering)
DO $$
BEGIN
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'home_hero';
    ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS usage_metadata JSONB DEFAULT '{"receipt_limit": 10, "storage_limit_mb": 500}';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Projects Enhancements (DIY & Hand-off)
DO $$
BEGIN
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS is_diy BOOLEAN DEFAULT false;
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_org_id UUID REFERENCES public.organizations(id);
EXCEPTION WHEN others THEN NULL;
END $$;

-- 3. Property Assets (Home Hero Manual)
-- We drop and recreate to ensure the schema matches the "Manual/Instructions" use case perfectly.
DROP TABLE IF EXISTS public.property_assets;

CREATE TABLE public.property_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    name TEXT NOT NULL,         -- "Miele Dishwasher", "Master Bedroom Paint"
    asset_type TEXT NOT NULL,   -- "appliance", "paint", "manual", "insurance"
    
    file_url TEXT,              -- PDF or Image of the manual/policy
    metadata JSONB DEFAULT '{}', -- { "color_code": "#FFF", "serial": "123", "warranty_end": "2027-01-01" }
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by Org
CREATE INDEX IF NOT EXISTS idx_property_assets_org ON public.property_assets(org_id);

COMMIT;
