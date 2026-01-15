-- Ultimate Transactions Table Definition (v2.1.1 Reference)

CREATE TABLE public.transactions (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID REFERENCES public.projects(id),
    user_id UUID REFERENCES auth.users(id),
    source_app TEXT,
    transaction_date DATE NOT NULL,
    
    -- Financial Core
    direction TEXT DEFAULT 'expense' CHECK (direction IN ('income', 'expense')),
    total_amount NUMERIC(15,2) NOT NULL,
    currency TEXT DEFAULT 'CAD',
    exchange_rate NUMERIC(10,5) DEFAULT 1.0,
    base_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_amount * exchange_rate) STORED,

    -- Taxation
    tax_amount NUMERIC(15,2),
    tax_details JSONB,
    is_tax_deductible BOOLEAN DEFAULT true,
    deductible_rate NUMERIC(3,2) DEFAULT 1.0,

    -- AI / Classification
    category_user TEXT,
    category_tax TEXT,
    expense_type TEXT DEFAULT 'business',
    is_capital_asset BOOLEAN DEFAULT false,
    vendor_name TEXT,

    -- Evidence
    attachment_url TEXT,
    image_hash TEXT,
    entry_source TEXT DEFAULT 'ocr',
    ai_confidence NUMERIC(3,2),

    -- Workflow
    status TEXT DEFAULT 'pending',
    payment_status TEXT DEFAULT 'paid',
    is_reimbursable BOOLEAN DEFAULT false,
    needs_review BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    internal_notes TEXT,

    -- Meta
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    description TEXT,
    quantity NUMERIC(15,2),
    unit_price NUMERIC(15,2),
    amount NUMERIC(15,2),
    category_tax TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 2: Labor Cost Module
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    full_name TEXT NOT NULL,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    role TEXT,
    is_active BOOLEAN DEFAULT true,
    
    overtime_enabled BOOLEAN DEFAULT false,
    ot_multiplier NUMERIC(3, 2) DEFAULT 1.0,
    is_diy_hero BOOLEAN DEFAULT false,

    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.property_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL,
    file_url TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Note: Organizations extended with plan_type, usage_metadata
-- Note: Projects extended with is_diy, client_org_id

CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    break_duration INT DEFAULT 0,
    
    period_date DATE GENERATED ALWAYS AS ((start_time AT TIME ZONE 'UTC')::date) STORED,
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.payrolls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    employee_id UUID NOT NULL REFERENCES public.employees(id),
    
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    
    total_hours NUMERIC(10, 2) DEFAULT 0,
    regular_pay NUMERIC(15, 2) DEFAULT 0,
    overtime_pay NUMERIC(15, 2) DEFAULT 0,
    bonus NUMERIC(15, 2) DEFAULT 0,
    
    total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (regular_pay + overtime_pay + bonus) STORED,
    
    transaction_id UUID REFERENCES public.transactions(id),
    
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 3: Subcontractor Module
CREATE TABLE public.subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    
    company_name TEXT NOT NULL,
    business_number TEXT,
    gst_number TEXT,
    sub_type TEXT,
    payment_terms TEXT DEFAULT 'Net 15',
    
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
-- Phase 5: JSS Core Business Logic (v2.5)
-- Note: Subcontractors extended with legal_name, recipient_type, gst_verified_at

CREATE TABLE public.change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    title TEXT NOT NULL,
    description TEXT,
    amount_change NUMERIC(15, 2),
    status TEXT DEFAULT 'draft',
    client_signature_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.billing_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    milestone_name TEXT NOT NULL,
    percentage NUMERIC(5, 2),
    amount NUMERIC(15, 2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    log_date DATE NOT NULL,
    checklist_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.deficiencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    description TEXT NOT NULL,
    photo_before_url TEXT,
    photo_after_url TEXT,
    assigned_to UUID REFERENCES public.employees(id),
    status TEXT DEFAULT 'open',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Phase 6: Localization & Timezones (v2.6)
-- Organizations: default_language ('en'), timezone ('America/Vancouver'), currency_code ('CAD')
-- Profiles: preferred_language, timezone
-- Transactions: original_language
