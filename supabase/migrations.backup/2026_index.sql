BEGIN;

-- ============================================================
-- Safe, Idempotent FK/Index Rebuild for Multi-tenant schema
-- Only touches the listed tables (whitelist).
-- ============================================================

DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'projects',
    'employees',
    'transactions',
    'billing_milestones',
    'change_orders',
    'deficiencies',
    'time_entries',
    'payrolls',
    'safety_logs',
    'transaction_items',
    'vendor_aliases',
    'subcontractors',
    'property_assets',
    'organization_members'
  ];
  r record;
BEGIN
  -- Drop FK constraints only on these tables
  FOREACH t IN ARRAY tbls LOOP
    FOR r IN
      SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class rel ON rel.oid = c.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE c.contype = 'f'
        AND nsp.nspname = 'public'
        AND rel.relname = t
    LOOP
      EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I CASCADE', t, r.conname);
    END LOOP;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- Parent-table composite uniqueness required for composite FKs
-- ------------------------------------------------------------
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_org_id_unique CASCADE,
  DROP CONSTRAINT IF EXISTS projects_org_id_id_uniq CASCADE;
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_org_id_unique CASCADE,
  DROP CONSTRAINT IF EXISTS employees_org_id_id_uniq CASCADE;
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_org_id_unique CASCADE,
  DROP CONSTRAINT IF EXISTS transactions_org_id_id_uniq CASCADE;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_org_id_id_uniq UNIQUE (organization_id, id);
ALTER TABLE public.employees
  ADD CONSTRAINT employees_org_id_id_uniq UNIQUE (organization_id, id);
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_org_id_id_uniq UNIQUE (organization_id, id);

-- ------------------------------------------------------------
-- Ensure columns compatible with ON DELETE SET NULL choices
-- ------------------------------------------------------------
DO $$
BEGIN
  -- payrolls.transaction_id must be nullable if FK uses ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payrolls' AND column_name='transaction_id'
  ) THEN
    EXECUTE 'ALTER TABLE public.payrolls ALTER COLUMN transaction_id DROP NOT NULL';
  END IF;

  -- deficiencies.assigned_to should be nullable if ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='deficiencies' AND column_name='assigned_to'
  ) THEN
    EXECUTE 'ALTER TABLE public.deficiencies ALTER COLUMN assigned_to DROP NOT NULL';
  END IF;

  -- safety_logs.conducted_by should be nullable if ON DELETE SET NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='safety_logs' AND column_name='conducted_by'
  ) THEN
    EXECUTE 'ALTER TABLE public.safety_logs ALTER COLUMN conducted_by DROP NOT NULL';
  END IF;
END $$;

-- ------------------------------------------------------------
-- organization_id -> organizations(id) for all business tables
-- ------------------------------------------------------------
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_org_fk,
  ADD CONSTRAINT projects_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_org_fk,
  ADD CONSTRAINT employees_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_org_fk,
  ADD CONSTRAINT transactions_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.billing_milestones
  DROP CONSTRAINT IF EXISTS billing_milestones_org_fk,
  ADD CONSTRAINT billing_milestones_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.change_orders
  DROP CONSTRAINT IF EXISTS change_orders_org_fk,
  ADD CONSTRAINT change_orders_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.deficiencies
  DROP CONSTRAINT IF EXISTS deficiencies_org_fk,
  ADD CONSTRAINT deficiencies_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_org_fk,
  ADD CONSTRAINT time_entries_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.payrolls
  DROP CONSTRAINT IF EXISTS payrolls_org_fk,
  ADD CONSTRAINT payrolls_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.safety_logs
  DROP CONSTRAINT IF EXISTS safety_logs_org_fk,
  ADD CONSTRAINT safety_logs_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.transaction_items
  DROP CONSTRAINT IF EXISTS transaction_items_org_fk,
  ADD CONSTRAINT transaction_items_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.vendor_aliases
  DROP CONSTRAINT IF EXISTS vendor_aliases_org_fk,
  ADD CONSTRAINT vendor_aliases_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.subcontractors
  DROP CONSTRAINT IF EXISTS subcontractors_org_fk,
  ADD CONSTRAINT subcontractors_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.property_assets
  DROP CONSTRAINT IF EXISTS property_assets_org_fk,
  ADD CONSTRAINT property_assets_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ------------------------------------------------------------
-- Composite foreign keys (tenant isolation)
-- ------------------------------------------------------------
ALTER TABLE public.billing_milestones
  DROP CONSTRAINT IF EXISTS billing_milestones_project_fk,
  ADD CONSTRAINT billing_milestones_project_fk
  FOREIGN KEY (organization_id, project_id)
  REFERENCES public.projects (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.change_orders
  DROP CONSTRAINT IF EXISTS change_orders_project_fk,
  ADD CONSTRAINT change_orders_project_fk
  FOREIGN KEY (organization_id, project_id)
  REFERENCES public.projects (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.deficiencies
  DROP CONSTRAINT IF EXISTS deficiencies_project_fk,
  ADD CONSTRAINT deficiencies_project_fk
  FOREIGN KEY (organization_id, project_id)
  REFERENCES public.projects (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.safety_logs
  DROP CONSTRAINT IF EXISTS safety_logs_project_fk,
  ADD CONSTRAINT safety_logs_project_fk
  FOREIGN KEY (organization_id, project_id)
  REFERENCES public.projects (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_project_fk,
  ADD CONSTRAINT time_entries_project_fk
  FOREIGN KEY (organization_id, project_id)
  REFERENCES public.projects (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.time_entries
  DROP CONSTRAINT IF EXISTS time_entries_employee_fk,
  ADD CONSTRAINT time_entries_employee_fk
  FOREIGN KEY (organization_id, employee_id)
  REFERENCES public.employees (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.payrolls
  DROP CONSTRAINT IF EXISTS payrolls_employee_fk,
  ADD CONSTRAINT payrolls_employee_fk
  FOREIGN KEY (organization_id, employee_id)
  REFERENCES public.employees (organization_id, id) ON DELETE CASCADE;

ALTER TABLE public.transaction_items
  DROP CONSTRAINT IF EXISTS transaction_items_transaction_fk,
  ADD CONSTRAINT transaction_items_transaction_fk
  FOREIGN KEY (organization_id, transaction_id)
  REFERENCES public.transactions (organization_id, id) ON DELETE CASCADE;

-- Optional composite links (SET NULL)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deficiencies' AND column_name='assigned_to') THEN
    EXECUTE 'ALTER TABLE public.deficiencies DROP CONSTRAINT IF EXISTS deficiencies_assigned_fk';
    EXECUTE 'ALTER TABLE public.deficiencies
             ADD CONSTRAINT deficiencies_assigned_fk
             FOREIGN KEY (organization_id, assigned_to)
             REFERENCES public.employees (organization_id, id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safety_logs' AND column_name='conducted_by') THEN
    EXECUTE 'ALTER TABLE public.safety_logs DROP CONSTRAINT IF EXISTS safety_logs_conducted_fk';
    EXECUTE 'ALTER TABLE public.safety_logs
             ADD CONSTRAINT safety_logs_conducted_fk
             FOREIGN KEY (organization_id, conducted_by)
             REFERENCES public.employees (organization_id, id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payrolls' AND column_name='transaction_id') THEN
    EXECUTE 'ALTER TABLE public.payrolls DROP CONSTRAINT IF EXISTS payrolls_transaction_fk';
    EXECUTE 'ALTER TABLE public.payrolls
             ADD CONSTRAINT payrolls_transaction_fk
             FOREIGN KEY (organization_id, transaction_id)
             REFERENCES public.transactions (organization_id, id) ON DELETE SET NULL';
  END IF;
END $$;

-- ------------------------------------------------------------
-- Audit fields (idempotent)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='billing_milestones' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.billing_milestones DROP CONSTRAINT IF EXISTS billing_milestones_created_by_fk';
    EXECUTE 'ALTER TABLE public.billing_milestones
             ADD CONSTRAINT billing_milestones_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='change_orders' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.change_orders DROP CONSTRAINT IF EXISTS change_orders_created_by_fk';
    EXECUTE 'ALTER TABLE public.change_orders
             ADD CONSTRAINT change_orders_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deficiencies' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.deficiencies DROP CONSTRAINT IF EXISTS deficiencies_created_by_fk';
    EXECUTE 'ALTER TABLE public.deficiencies
             ADD CONSTRAINT deficiencies_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='time_entries' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.time_entries DROP CONSTRAINT IF EXISTS time_entries_created_by_fk';
    EXECUTE 'ALTER TABLE public.time_entries
             ADD CONSTRAINT time_entries_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_created_by_fk';
    EXECUTE 'ALTER TABLE public.transactions
             ADD CONSTRAINT transactions_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='created_by') THEN
    EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_created_by_fk';
    EXECUTE 'ALTER TABLE public.projects
             ADD CONSTRAINT projects_created_by_fk
             FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='projects' AND column_name='deleted_by') THEN
    EXECUTE 'ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_deleted_by_fk';
    EXECUTE 'ALTER TABLE public.projects
             ADD CONSTRAINT projects_deleted_by_fk
             FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='deleted_by') THEN
    EXECUTE 'ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_deleted_by_fk';
    EXECUTE 'ALTER TABLE public.transactions
             ADD CONSTRAINT transactions_deleted_by_fk
             FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL';
  END IF;
END $$;

-- ------------------------------------------------------------
-- organization_members: enforce integrity
-- ------------------------------------------------------------
-- Clean up NULLs if any exist (so NOT NULL won't fail)
DELETE FROM public.organization_members
WHERE organization_id IS NULL OR user_id IS NULL;

ALTER TABLE public.organization_members
  ALTER COLUMN organization_id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_org_fk,
  ADD CONSTRAINT organization_members_org_fk
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_user_fk,
  ADD CONSTRAINT organization_members_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_org_user_key,
  DROP CONSTRAINT IF EXISTS organization_members_org_user_unique,
  DROP CONSTRAINT IF EXISTS organization_members_org_user_uniq,
  ADD CONSTRAINT organization_members_org_user_uniq UNIQUE (organization_id, user_id);

-- ------------------------------------------------------------
-- Indexes for composite FKs & common joins
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_billing_milestones_org_project ON public.billing_milestones(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_org_project     ON public.change_orders(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_org_project      ON public.deficiencies(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_org_project       ON public.safety_logs(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_project      ON public.time_entries(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_employee     ON public.time_entries(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_org_employee         ON public.payrolls(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_org_txn     ON public.transaction_items(organization_id, transaction_id);

CREATE INDEX IF NOT EXISTS idx_org_members_org              ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user             ON public.organization_members(user_id);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deficiencies' AND column_name='assigned_to') THEN
    CREATE INDEX IF NOT EXISTS idx_deficiencies_org_assigned ON public.deficiencies(organization_id, assigned_to);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safety_logs' AND column_name='conducted_by') THEN
    CREATE INDEX IF NOT EXISTS idx_safety_logs_org_conducted ON public.safety_logs(organization_id, conducted_by);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payrolls' AND column_name='transaction_id') THEN
    CREATE INDEX IF NOT EXISTS idx_payrolls_org_txn ON public.payrolls(organization_id, transaction_id);
  END IF;
END $$;

COMMIT;
