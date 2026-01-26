-- =====================================================================
-- Fix FK chaos + enforce multi-tenant composite FKs (organization_id, id)
-- Migration: 20260120000000_fix_fks_and_indexes_v1
--
-- Strategy:
-- 1) DROP all existing public foreign keys (they are malformed/duplicated)
-- 2) Ensure parent tables have UNIQUE(organization_id, id)
-- 3) Re-add canonical FKs:
--    - organization_id -> organizations(id) on all business tables
--    - composite FKs: (organization_id, child_fk_id) -> parent(organization_id, id)
-- 4) Add indexes for FK columns + sanity checks
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) DROP all existing FK constraints in public schema
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS table_name
    FROM pg_constraint
    WHERE contype = 'f'
      AND connamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE', r.table_name, r.conname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 1) Parent tables: ensure UNIQUE(organization_id, id)
--    Needed for composite FKs: (organization_id, xxx_id) -> parent(organization_id, id)
-- ---------------------------------------------------------------------

-- Projects
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_org_id_unique CASCADE;
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_org_id_id_uniq CASCADE;
ALTER TABLE public.projects
  ADD CONSTRAINT projects_org_id_id_uniq UNIQUE (organization_id, id);

-- Employees
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_org_id_unique CASCADE;
ALTER TABLE public.employees
  DROP CONSTRAINT IF EXISTS employees_org_id_id_uniq CASCADE;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_org_id_id_uniq UNIQUE (organization_id, id);

-- Transactions
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_org_id_unique CASCADE;
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_org_id_id_uniq CASCADE;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_org_id_id_uniq UNIQUE (organization_id, id);

-- ---------------------------------------------------------------------
-- 2) Canonical organization_id -> organizations(id) FK for business tables
--    (Only add if the table exists)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.organizations') IS NULL THEN
    RAISE EXCEPTION 'public.organizations does not exist. Abort.';
  END IF;

  -- Helper: add org fk if table exists
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.employees') IS NOT NULL THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.transactions') IS NOT NULL THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.billing_milestones') IS NOT NULL THEN
    ALTER TABLE public.billing_milestones
      ADD CONSTRAINT billing_milestones_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.change_orders') IS NOT NULL THEN
    ALTER TABLE public.change_orders
      ADD CONSTRAINT change_orders_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.deficiencies') IS NOT NULL THEN
    ALTER TABLE public.deficiencies
      ADD CONSTRAINT deficiencies_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.time_entries') IS NOT NULL THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.payrolls') IS NOT NULL THEN
    ALTER TABLE public.payrolls
      ADD CONSTRAINT payrolls_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.safety_logs') IS NOT NULL THEN
    ALTER TABLE public.safety_logs
      ADD CONSTRAINT safety_logs_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.transaction_items') IS NOT NULL THEN
    ALTER TABLE public.transaction_items
      ADD CONSTRAINT transaction_items_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.vendor_aliases') IS NOT NULL THEN
    ALTER TABLE public.vendor_aliases
      ADD CONSTRAINT vendor_aliases_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.subcontractors') IS NOT NULL THEN
    ALTER TABLE public.subcontractors
      ADD CONSTRAINT subcontractors_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.property_assets') IS NOT NULL THEN
    ALTER TABLE public.property_assets
      ADD CONSTRAINT property_assets_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) Composite foreign keys (the correct multi-tenant enforcement)
-- ---------------------------------------------------------------------

-- projects children: (organization_id, project_id) -> projects(organization_id, id)
DO $$
BEGIN
  IF to_regclass('public.projects') IS NULL THEN
    RAISE EXCEPTION 'public.projects missing. Abort.';
  END IF;

  IF to_regclass('public.billing_milestones') IS NOT NULL THEN
    ALTER TABLE public.billing_milestones
      ADD CONSTRAINT billing_milestones_project_fk
      FOREIGN KEY (organization_id, project_id)
      REFERENCES public.projects(organization_id, id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.change_orders') IS NOT NULL THEN
    ALTER TABLE public.change_orders
      ADD CONSTRAINT change_orders_project_fk
      FOREIGN KEY (organization_id, project_id)
      REFERENCES public.projects(organization_id, id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.deficiencies') IS NOT NULL THEN
    ALTER TABLE public.deficiencies
      ADD CONSTRAINT deficiencies_project_fk
      FOREIGN KEY (organization_id, project_id)
      REFERENCES public.projects(organization_id, id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.safety_logs') IS NOT NULL THEN
    ALTER TABLE public.safety_logs
      ADD CONSTRAINT safety_logs_project_fk
      FOREIGN KEY (organization_id, project_id)
      REFERENCES public.projects(organization_id, id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.time_entries') IS NOT NULL THEN
    -- project_id might be nullable in your model; FK is still OK when NULL
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_project_fk
      FOREIGN KEY (organization_id, project_id)
      REFERENCES public.projects(organization_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- employees children: (organization_id, employee_id) -> employees(organization_id, id)
DO $$
BEGIN
  IF to_regclass('public.employees') IS NULL THEN
    RAISE EXCEPTION 'public.employees missing. Abort.';
  END IF;

  IF to_regclass('public.time_entries') IS NOT NULL THEN
    ALTER TABLE public.time_entries
      ADD CONSTRAINT time_entries_employee_fk
      FOREIGN KEY (organization_id, employee_id)
      REFERENCES public.employees(organization_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF to_regclass('public.payrolls') IS NOT NULL THEN
    ALTER TABLE public.payrolls
      ADD CONSTRAINT payrolls_employee_fk
      FOREIGN KEY (organization_id, employee_id)
      REFERENCES public.employees(organization_id, id)
      ON DELETE RESTRICT;
  END IF;

  IF to_regclass('public.deficiencies') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deficiencies' AND column_name='assigned_to') THEN
    ALTER TABLE public.deficiencies
      ADD CONSTRAINT deficiencies_assigned_fk
      FOREIGN KEY (organization_id, assigned_to)
      REFERENCES public.employees(organization_id, id)
      ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.safety_logs') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safety_logs' AND column_name='conducted_by') THEN
    ALTER TABLE public.safety_logs
      ADD CONSTRAINT safety_logs_conducted_fk
      FOREIGN KEY (organization_id, conducted_by)
      REFERENCES public.employees(organization_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- transactions children: (organization_id, transaction_id) -> transactions(organization_id, id)
DO $$
BEGIN
  IF to_regclass('public.transactions') IS NULL THEN
    RAISE EXCEPTION 'public.transactions missing. Abort.';
  END IF;

  IF to_regclass('public.transaction_items') IS NOT NULL THEN
    ALTER TABLE public.transaction_items
      ADD CONSTRAINT transaction_items_transaction_fk
      FOREIGN KEY (organization_id, transaction_id)
      REFERENCES public.transactions(organization_id, id)
      ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.payrolls') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payrolls' AND column_name='transaction_id') THEN
    ALTER TABLE public.payrolls
      ADD CONSTRAINT payrolls_transaction_fk
      FOREIGN KEY (organization_id, transaction_id)
      REFERENCES public.transactions(organization_id, id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) Auth/profile/user relationships (restore what should exist)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    -- profiles.id -> auth.users(id)
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE connamespace='public'::regnamespace
        AND conname='profiles_user_fk'
    ) THEN
      ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_user_fk
        FOREIGN KEY (id) REFERENCES auth.users(id)
        ON DELETE CASCADE;
    END IF;
  END IF;

  IF to_regclass('public.organization_members') IS NOT NULL THEN
    -- organization_members.organization_id -> organizations
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_org_fk
      FOREIGN KEY (organization_id) REFERENCES public.organizations(id)
      ON DELETE CASCADE;

    -- organization_members.user_id -> auth.users
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_user_fk
      FOREIGN KEY (user_id) REFERENCES auth.users(id)
      ON DELETE CASCADE;

    -- unique (organization_id, user_id)
    ALTER TABLE public.organization_members
      DROP CONSTRAINT IF EXISTS organization_members_org_user_uniq CASCADE;
    ALTER TABLE public.organization_members
      ADD CONSTRAINT organization_members_org_user_uniq UNIQUE (organization_id, user_id);

    -- enforce NOT NULL if your “constitution” requires it
    ALTER TABLE public.organization_members
      ALTER COLUMN organization_id SET NOT NULL,
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 5) Indexes (FK columns + common filters)
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_org_id            ON public.projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_org_id           ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_id        ON public.transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_transactions_org_project   ON public.transactions(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date          ON public.transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_billing_milestones_org_project ON public.billing_milestones(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_org_project      ON public.change_orders(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_deficiencies_org_project       ON public.deficiencies(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_org_project        ON public.safety_logs(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_project       ON public.time_entries(organization_id, project_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_employee      ON public.time_entries(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_org_employee          ON public.payrolls(organization_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_org_txn      ON public.transaction_items(organization_id, transaction_id);
CREATE INDEX IF NOT EXISTS idx_vendor_aliases_org_alias       ON public.vendor_aliases(organization_id, alias);

-- Optional indexes for nullable refs (only if columns exist)
DO $$
BEGIN
  IF to_regclass('public.deficiencies') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='deficiencies' AND column_name='assigned_to') THEN
    CREATE INDEX IF NOT EXISTS idx_deficiencies_org_assigned ON public.deficiencies(organization_id, assigned_to);
  END IF;

  IF to_regclass('public.safety_logs') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='safety_logs' AND column_name='conducted_by') THEN
    CREATE INDEX IF NOT EXISTS idx_safety_logs_org_conducted ON public.safety_logs(organization_id, conducted_by);
  END IF;

  IF to_regclass('public.payrolls') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='payrolls' AND column_name='transaction_id') THEN
    CREATE INDEX IF NOT EXISTS idx_payrolls_org_txn ON public.payrolls(organization_id, transaction_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 6) Sanity constraints (lightweight, safe)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.payrolls') IS NOT NULL THEN
    -- ensure period_end >= period_start
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE connamespace='public'::regnamespace
        AND conname='payrolls_period_valid_chk'
    ) THEN
      ALTER TABLE public.payrolls
        ADD CONSTRAINT payrolls_period_valid_chk
        CHECK (period_end >= period_start);
    END IF;
  END IF;
END $$;

COMMIT;
