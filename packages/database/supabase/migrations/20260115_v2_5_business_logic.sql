-- Migration: JSS Core Business Logic (v2.5)
-- Timestamp: 20260115000001 (Sequenced after Home Hero)

BEGIN;

-- 1. Subcontractor Compliance (T5018 Extensions)
DO $$
BEGIN
    ALTER TABLE public.subcontractors ADD COLUMN IF NOT EXISTS legal_name TEXT;
    ALTER TABLE public.subcontractors ADD COLUMN IF NOT EXISTS recipient_type TEXT DEFAULT 'Corporation' CHECK (recipient_type IN ('Individual', 'Corporation', 'Partnership', 'Trust'));
    ALTER TABLE public.subcontractors ADD COLUMN IF NOT EXISTS gst_verified_at TIMESTAMPTZ;
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Change Orders Module
CREATE TABLE IF NOT EXISTS public.change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    
    title TEXT NOT NULL,
    description TEXT,
    amount_change NUMERIC(15, 2) DEFAULT 0.00, -- Can be negative for credits
    
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_signature', 'approved', 'rejected')),
    client_signature_url TEXT,
    signed_at TIMESTAMPTZ,
    
    formatted_id TEXT GENERATED ALWAYS AS (SUBSTRING(title FROM 1 FOR 3) || '-' || SUBSTRING(id::text FROM 1 FOR 4)) STORED, -- Simple Ref ID
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Billing Milestones Module
CREATE TABLE IF NOT EXISTS public.billing_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    
    milestone_name TEXT NOT NULL, -- e.g. "Upon Completion of Framing"
    percentage NUMERIC(5, 2),     -- 20.00
    amount NUMERIC(15, 2),        -- Fixed Amount Override
    
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'invoiced', 'paid')),
    due_date DATE,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Safety Logs (WorkSafeBC)
CREATE TABLE IF NOT EXISTS public.safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    conducted_by UUID REFERENCES public.employees(id),
    
    checklist_data JSONB DEFAULT '{}', -- { "ppe_check": true, "access_clear": true }
    weather_notes TEXT,
    incident_reported BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Deficiencies (Punch List)
CREATE TABLE IF NOT EXISTS public.deficiencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'critical')),
    
    photo_before_url TEXT,
    photo_after_url TEXT,
    
    assigned_to UUID REFERENCES public.employees(id),
    resolved_at TIMESTAMPTZ,
    
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for Dashboard Performance
CREATE INDEX IF NOT EXISTS idx_change_orders_project ON public.change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_milestones_project ON public.billing_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_project ON public.deficiencies(project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_assignee ON public.deficiencies(assigned_to);

COMMIT;
