-- =====================================================================
-- Constitutional Compliance: Indexes & RLS
-- Phase 03: 索引 + RLS policies (只为存在的表创建)
-- =====================================================================

-- Core multi-tenant isolation indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        CREATE INDEX IF NOT EXISTS idx_projects_org ON public.projects(organization_id) WHERE deleted_at IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_time_entries_org ON public.time_entries(organization_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_org ON public.transactions(organization_id) WHERE deleted_at IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        CREATE INDEX IF NOT EXISTS idx_employees_org ON public.employees(organization_id) WHERE is_active = true;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
        CREATE INDEX IF NOT EXISTS idx_estimates_org ON public.estimates(organization_id) WHERE deleted_at IS NULL;
    END IF;
END $$;

-- Composite foreign key indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_milestones') THEN
        CREATE INDEX IF NOT EXISTS idx_billing_milestones_org_project ON public.billing_milestones(organization_id, project_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_orders') THEN
        CREATE INDEX IF NOT EXISTS idx_change_orders_org_project ON public.change_orders(organization_id, project_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deficiencies') THEN
        CREATE INDEX IF NOT EXISTS idx_deficiencies_org_project ON public.deficiencies(organization_id, project_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_time_entries_org_project ON public.time_entries(organization_id, project_id) WHERE project_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_time_entries_org_employee ON public.time_entries(organization_id, employee_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_items') THEN
        CREATE INDEX IF NOT EXISTS idx_transaction_items_org_txn ON public.transaction_items(organization_id, transaction_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        CREATE INDEX IF NOT EXISTS idx_payrolls_org_employee ON public.payrolls(organization_id, employee_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_items') THEN
        CREATE INDEX IF NOT EXISTS idx_estimate_items_org_estimate ON public.estimate_items(organization_id, estimate_id);
    END IF;
END $$;

-- Time-range query indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON public.transactions(organization_id, transaction_date DESC) WHERE deleted_at IS NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payrolls') THEN
        CREATE INDEX IF NOT EXISTS idx_payrolls_org_period ON public.payrolls(organization_id, period_start DESC, period_end DESC);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        CREATE INDEX IF NOT EXISTS idx_time_entries_org_period ON public.time_entries(organization_id, period_date DESC);
    END IF;
END $$;

-- User permission indexes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_members') THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_org_members_org_user ON public.organization_members(organization_id, user_id);
        CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        CREATE INDEX IF NOT EXISTS idx_employees_org_user ON public.employees(organization_id, user_id) WHERE user_id IS NOT NULL;
    END IF;
END $$;

-- Enable RLS (只为存在的表)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'employees') THEN
        ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
        ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Helper function
CREATE OR REPLACE FUNCTION public.user_in_organization(org_uuid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_uuid
        AND user_id = auth.uid()
    );
$$;

-- RLS Policies (只为存在的表)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        DROP POLICY IF EXISTS "Users can view their org's projects" ON public.projects;
        CREATE POLICY "Users can view their org's projects" ON public.projects
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
        DROP POLICY IF EXISTS "Users can view their org's tasks" ON public.tasks;
        CREATE POLICY "Users can view their org's tasks" ON public.tasks
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
        DROP POLICY IF EXISTS "Users can view their org's transactions" ON public.transactions;
        CREATE POLICY "Users can view their org's transactions" ON public.transactions
            FOR SELECT USING (
                organization_id IN (
                    SELECT organization_id FROM public.organization_members
                    WHERE user_id = auth.uid()
                )
            );
    END IF;
END $$;
