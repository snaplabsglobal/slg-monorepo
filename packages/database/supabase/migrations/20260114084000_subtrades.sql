-- Migration: Phase 3 Subcontractor Module (v2.3.0 Match)
-- Timestamp: 20260114084000

BEGIN;

-- 1. Create Subcontractors Table
CREATE TABLE IF NOT EXISTS public.subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    company_name TEXT NOT NULL,
    business_number TEXT, -- CRA BN / SIN
    gst_number TEXT,      -- RT0001
    sub_type TEXT,        -- "Plumbing", "Electrical"
    payment_terms TEXT DEFAULT 'Net 15',
    
    contact_info JSONB DEFAULT '{}', -- { name: "Mike", email: "...", phone: "..." }
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enhance Transactions Table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS subcontractor_id UUID REFERENCES public.subcontractors(id);

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_subcontractor ON public.transactions(subcontractor_id);

COMMIT;
