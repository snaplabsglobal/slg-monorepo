BEGIN;

-- Drop all existing foreign key constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname, conrelid::regclass::text as table_name
        FROM pg_constraint
        WHERE contype = 'f'
        AND connamespace = 'public'::regnamespace
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_name, r.conname);
    END LOOP;
END $$;

-- Drop existing unique constraints on parent tables
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_org_id_unique CASCADE;
ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_org_id_id_uniq CASCADE;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_org_id_unique CASCADE;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_org_id_id_uniq CASCADE;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_org_id_unique CASCADE;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_org_id_id_uniq CASCADE;

-- Add UNIQUE(organization_id, id) to parent tables
ALTER TABLE public.projects ADD CONSTRAINT projects_org_id_id_uniq UNIQUE (organization_id, id);
ALTER TABLE public.employees ADD CONSTRAINT employees_org_id_id_uniq UNIQUE (organization_id, id);
ALTER TABLE public.transactions ADD CONSTRAINT transactions_org_id_id_uniq UNIQUE (organization_id, id);

-- organization_id -> organizations(id) for all business tables
ALTER TABLE public.projects ADD CONSTRAINT projects_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.employees ADD CONSTRAINT employees_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.billing_milestones ADD CONSTRAINT billing_milestones_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.deficiencies ADD CONSTRAINT deficiencies_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.payrolls ADD CONSTRAINT payrolls_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.safety_logs ADD CONSTRAINT safety_logs_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.vendor_aliases ADD CONSTRAINT vendor_aliases_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.subcontractors ADD CONSTRAINT subcontractors_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.property_assets ADD CONSTRAINT property_assets_org_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Composite foreign keys
ALTER TABLE public.billing_milestones ADD CONSTRAINT billing_milestones_project_fk FOREIGN KEY (organization_id, project_id) REFERENCES public.projects(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_project_fk FOREIGN KEY (organization_id, project_id) REFERENCES public.projects(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.deficiencies ADD CONSTRAINT deficiencies_project_fk FOREIGN KEY (organization_id, project_id) REFERENCES public.projects(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.safety_logs ADD CONSTRAINT safety_logs_project_fk FOREIGN KEY (organization_id, project_id) REFERENCES public.projects(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_project_fk FOREIGN KEY (organization_id, project_id) REFERENCES public.projects(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_employee_fk FOREIGN KEY (organization_id, employee_id) REFERENCES public.employees(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.payrolls ADD CONSTRAINT payrolls_employee_fk FOREIGN KEY (organization_id, employee_id) REFERENCES public.employees(organization_id, id) ON DELETE CASCADE;
ALTER TABLE public.transaction_items ADD CONSTRAINT transaction_items_transaction_fk FOREIGN KEY (organization_id, transaction_id) REFERENCES public.transactions(organization_id, id) ON DELETE CASCADE;

-- Conditional composite FKs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deficiencies' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.deficiencies ADD CONSTRAINT deficiencies_assigned_fk FOREIGN KEY (organization_id, assigned_to) REFERENCES public.employees(organization_id, id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_logs' AND column_name = 'conducted_by') THEN
        ALTER TABLE public.safety_logs ADD CONSTRAINT safety_logs_conducted_fk FOREIGN KEY (organization_id, conducted_by) REFERENCES public.employees(organization_id, id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payrolls' AND column_name = 'transaction_id') THEN
        ALTER TABLE public.payrolls ADD CONSTRAINT payrolls_transaction_fk FOREIGN KEY (organization_id, transaction_id) REFERENCES public.transactions(organization_id, id) ON DELETE SET NULL;
    END IF;
END $$;

-- Indexes for composite FK columns
CREATE INDEX IF NOT EXISTS idx_billing_milestones_org_project ON public.billing_milestones(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_org_project ON public.change_orders(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_org_project ON public.deficiencies(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_org_project ON public.safety_logs(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_project ON public.time_entries(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_employee ON public.time_entries(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_org_employee ON public.payrolls(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_org_txn ON public.transaction_items(organization_id, transaction_id);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deficiencies' AND column_name = 'assigned_to') THEN
        CREATE INDEX IF NOT EXISTS idx_deficiencies_org_assigned ON public.deficiencies(organization_id, assigned_to);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'safety_logs' AND column_name = 'conducted_by') THEN
        CREATE INDEX IF NOT EXISTS idx_safety_logs_org_conducted ON public.safety_logs(organization_id, conducted_by);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payrolls' AND column_name = 'transaction_id') THEN
        CREATE INDEX IF NOT EXISTS idx_payrolls_org_txn ON public.payrolls(organization_id, transaction_id);
    END IF;
END $$;

-- Audit fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_milestones' AND column_name = 'created_by') THEN
        ALTER TABLE public.billing_milestones ADD CONSTRAINT billing_milestones_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'change_orders' AND column_name = 'created_by') THEN
        ALTER TABLE public.change_orders ADD CONSTRAINT change_orders_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deficiencies' AND column_name = 'created_by') THEN
        ALTER TABLE public.deficiencies ADD CONSTRAINT deficiencies_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'created_by') THEN
        ALTER TABLE public.time_entries ADD CONSTRAINT time_entries_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'created_by') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'created_by') THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'deleted_by') THEN
        ALTER TABLE public.projects ADD CONSTRAINT projects_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'deleted_by') THEN
        ALTER TABLE public.transactions ADD CONSTRAINT transactions_deleted_by_fk FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- organization_members unique constraint
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_org_user_key CASCADE;
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_org_user_unique CASCADE;
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_org_user_uniq CASCADE;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_org_user_uniq UNIQUE (organization_id, user_id);

COMMIT;
