-- =====================================================================
-- Constitutional Compliance: Core Tables & Type Fixes (空库安全版)
-- Phase 01: 建表/字段类型修正 (no destructive delete)
-- =====================================================================
-- 说明：本迁移为空库优化，可重复执行，不会误删数据
-- 如遇 NULL 数据会抛出异常而非静默删除

-- =====================================================================
-- SECTION 1: Fix USER-DEFINED types (临时方案，空库启动)
-- =====================================================================
-- 说明：生产环境需安装 pgvector + postgis 后再迁移

DO $$ 
BEGIN
    -- Projects: 地理位置字段临时改为 jsonb (检查列存在性)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'location_point') THEN
        ALTER TABLE public.projects 
            ALTER COLUMN location_point TYPE jsonb USING location_point::text::jsonb;
        
        COMMENT ON COLUMN public.projects.location_point IS 
        'Temporary jsonb storage. Migrate to geography(POINT, 4326) after installing PostGIS';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'geofence') THEN
        ALTER TABLE public.projects 
            ALTER COLUMN geofence TYPE jsonb USING geofence::text::jsonb;
    END IF;

    -- Timecards: GPS 位置临时改为 jsonb
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timecards' AND column_name = 'check_in_location') THEN
        ALTER TABLE public.timecards 
            ALTER COLUMN check_in_location TYPE jsonb USING check_in_location::text::jsonb;
    END IF;

    -- Transactions: GPS 字段临时改为 jsonb
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'gps_location') THEN
        ALTER TABLE public.transactions 
            ALTER COLUMN gps_location TYPE jsonb USING gps_location::text::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'gps_coordinates') THEN
        ALTER TABLE public.transactions 
            ALTER COLUMN gps_coordinates TYPE jsonb USING gps_coordinates::text::jsonb;
    END IF;

    -- Embeddings: 向量字段临时改为 jsonb（存储数组）
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_market_prices' AND column_name = 'embedding') THEN
        ALTER TABLE public.material_market_prices 
            ALTER COLUMN embedding TYPE jsonb USING embedding::text::jsonb;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction_items' AND column_name = 'image_embedding') THEN
        ALTER TABLE public.transaction_items 
            ALTER COLUMN image_embedding TYPE jsonb USING image_embedding::text::jsonb;
    END IF;
END $$;

-- =====================================================================
-- SECTION 2: Fix ARRAY types (必须指定元素类型)
-- =====================================================================

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contractor_portfolios' 
        AND column_name = 'specialties'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.contractor_portfolios 
            ALTER COLUMN specialties TYPE text[] USING specialties::text[];
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reviews' 
        AND column_name = 'tags'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.reviews 
            ALTER COLUMN tags TYPE text[] USING tags::text[];
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_templates' 
        AND column_name = 'suggested_tools'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.task_templates 
            ALTER COLUMN suggested_tools TYPE text[] USING suggested_tools::text[];
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_templates' 
        AND column_name = 'suggested_materials'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.task_templates 
            ALTER COLUMN suggested_materials TYPE text[] USING suggested_materials::text[];
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'risk_reasons'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.transactions 
            ALTER COLUMN risk_reasons TYPE text[] USING risk_reasons::text[];
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_feedback' 
        AND column_name = 'tags'
        AND udt_name != '_text'
    ) THEN
        ALTER TABLE public.user_feedback 
            ALTER COLUMN tags TYPE text[] USING tags::text[];
    END IF;
END $$;

-- =====================================================================
-- SECTION 2.5: Rename org_id to organization_id (宪法合规)
-- =====================================================================
-- 基础 schema 使用 org_id，我们需要统一为 organization_id

DO $$ 
DECLARE
    target_tables text[] := ARRAY[
        'billing_milestones', 'change_orders', 'deficiencies', 'employees',
        'organization_members', 'payrolls', 'projects', 'safety_logs',
        'subcontractors', 'time_entries', 'transactions', 'transaction_items',
        'vendor_aliases', 'property_assets'
    ];
    tbl_name text;
BEGIN
    FOREACH tbl_name IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name) THEN
            -- 如果有 org_id 但没有 organization_id，则重命名
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'org_id') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = tbl_name AND column_name = 'organization_id') THEN
                    EXECUTE format('ALTER TABLE public.%I RENAME COLUMN org_id TO organization_id', tbl_name);
                    RAISE NOTICE 'Renamed org_id to organization_id in table: %', tbl_name;
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================================
-- SECTION 3: Add missing organization_id columns
-- =====================================================================

DO $$ 
BEGIN
    -- time_entries: 从 employee 或 project 获取 organization_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'time_entries' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.time_entries ADD COLUMN organization_id uuid;
        END IF;

        -- 优先从 employee 表回填
        UPDATE public.time_entries te
        SET organization_id = e.organization_id
        FROM public.employees e
        WHERE te.employee_id = e.id AND te.organization_id IS NULL;

        -- 如果还有 NULL，从 project 表回填
        UPDATE public.time_entries te
        SET organization_id = p.organization_id
        FROM public.projects p
        WHERE te.project_id = p.id AND te.organization_id IS NULL;
    END IF;

    -- estimate_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'estimate_items' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.estimate_items ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.estimate_items ei
        SET organization_id = e.organization_id
        FROM public.estimates e
        WHERE ei.estimate_id = e.id AND ei.organization_id IS NULL;
    END IF;

    -- transaction_items: 从 transaction 获取 organization_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transaction_items' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.transaction_items ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.transaction_items ti
        SET organization_id = t.organization_id
        FROM public.transactions t
        WHERE ti.transaction_id = t.id AND ti.organization_id IS NULL;
    END IF;

    -- project_drawings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_drawings') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'project_drawings' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.project_drawings ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.project_drawings pd
        SET organization_id = p.organization_id
        FROM public.projects p
        WHERE pd.project_id = p.id AND pd.organization_id IS NULL;
    END IF;

    -- project_issues
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_issues') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'project_issues' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.project_issues ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.project_issues pi
        SET organization_id = p.organization_id
        FROM public.projects p
        WHERE pi.project_id = p.id AND pi.organization_id IS NULL;
    END IF;

    -- project_media
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_media') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'project_media' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.project_media ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.project_media pm
        SET organization_id = p.organization_id
        FROM public.projects p
        WHERE pm.project_id = p.id AND pm.organization_id IS NULL;
    END IF;

    -- construction_alerts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'construction_alerts') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'construction_alerts' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.construction_alerts ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.construction_alerts ca
        SET organization_id = p.organization_id
        FROM public.projects p
        WHERE ca.project_id = p.id AND ca.organization_id IS NULL;
    END IF;

    -- assembly_components
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assembly_components') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assembly_components' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.assembly_components ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.assembly_components ac
        SET organization_id = a.organization_id
        FROM public.assemblies a
        WHERE ac.assembly_id = a.id AND ac.organization_id IS NULL;
    END IF;

    -- assembly_items
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assembly_items') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'assembly_items' AND column_name = 'organization_id'
        ) THEN
            ALTER TABLE public.assembly_items ADD COLUMN organization_id uuid;
        END IF;

        UPDATE public.assembly_items ai
        SET organization_id = a.organization_id
        FROM public.assemblies a
        WHERE ai.assembly_id = a.id AND ai.organization_id IS NULL;
    END IF;
END $$;

-- =====================================================================
-- SECTION 4: Enforce NOT NULL on organization_id (安全方式)
-- =====================================================================

DO $$ 
DECLARE
    null_count int;
    tbl_name text;
    target_tables text[] := ARRAY[
        'projects', 'tasks', 'time_entries', 'transaction_items', 
        'timecards', 'measurements', 'attachments', 'contractor_portfolios',
        'vendor_aliases', 'project_budgets', 'production_logs', 'estimate_items',
        'project_drawings', 'project_issues', 'project_media', 'construction_alerts',
        'assembly_components', 'assembly_items'
    ];
BEGIN
    FOREACH tbl_name IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = tbl_name) THEN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = tbl_name 
                AND column_name = 'organization_id'
            ) THEN
                EXECUTE format('SELECT COUNT(*) FROM public.%I WHERE organization_id IS NULL', tbl_name) INTO null_count;
                
                IF null_count > 0 THEN
                    RAISE EXCEPTION 'Migration aborted: table "%" has % rows with NULL organization_id. Please fix data before migration.', 
                        tbl_name, null_count;
                END IF;
                
                EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', tbl_name);
                RAISE NOTICE 'Set organization_id NOT NULL on table: %', tbl_name;
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================================
-- SECTION 5: Fix estimate_items calculated fields (只在列存在时)
-- =====================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'total_price_cents') THEN
        ALTER TABLE public.estimate_items 
            DROP COLUMN IF EXISTS total_price_cents CASCADE;
        
        ALTER TABLE public.estimate_items 
            ADD COLUMN total_price_cents bigint GENERATED ALWAYS AS (
                round((quantity * COALESCE(unit_price_cents, 0)::numeric) * (1 + COALESCE(markup_percentage, 0) / 100.0))::bigint
            ) STORED;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'calculated_total_cents') THEN
        ALTER TABLE public.estimate_items 
            DROP COLUMN IF EXISTS calculated_total_cents CASCADE;

        ALTER TABLE public.estimate_items 
            ADD COLUMN calculated_total_cents bigint GENERATED ALWAYS AS (
                round((quantity * COALESCE(unit_cost_cents, 0)::numeric))::bigint
            ) STORED;
    END IF;
END $$;

-- =====================================================================
-- SECTION 6: Fix transactions calculated fields (只在列存在时)
-- =====================================================================

DO $$ 
BEGIN
    -- 只在 total_amount_cents 列存在时执行
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'total_amount_cents') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'base_amount_cents') THEN
            ALTER TABLE public.transactions 
                DROP COLUMN IF EXISTS base_amount_cents CASCADE;

            ALTER TABLE public.transactions 
                ADD COLUMN base_amount_cents bigint GENERATED ALWAYS AS (
                    round((total_amount_cents::numeric * COALESCE(exchange_rate, 1.0)))::bigint
                ) STORED;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'tax_amount_cents') THEN
            ALTER TABLE public.transactions 
                DROP COLUMN IF EXISTS tax_amount_cents CASCADE;

            ALTER TABLE public.transactions 
                ADD COLUMN tax_amount_cents bigint GENERATED ALWAYS AS (
                    COALESCE(primary_tax_amount_cents, 0) + COALESCE(secondary_tax_amount_cents, 0)
                ) STORED;
        END IF;
    END IF;
END $$;

-- =====================================================================
-- SECTION 7: Fix currency precision (只在列存在时)
-- =====================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'exchange_rate') THEN
        -- 检查当前类型，只在需要时修改
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'transactions' 
            AND column_name = 'exchange_rate'
            AND data_type = 'numeric'
            AND (numeric_precision IS NULL OR numeric_precision != 10 OR numeric_scale != 5)
        ) THEN
            ALTER TABLE public.transactions 
                ALTER COLUMN exchange_rate TYPE numeric(10,5) USING COALESCE(exchange_rate, 1.0);
        END IF;
    END IF;
END $$;

-- =====================================================================
-- SECTION 8: Add deleted_at for soft delete (极简版)
-- =====================================================================

DO $$ 
DECLARE
    target_tables text[] := ARRAY['estimates', 'projects', 'stock_presets', 'transactions', 'attachments', 'tasks'];
    t text;
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS deleted_at timestamptz', t);
            RAISE NOTICE 'Added deleted_at to table: %', t;
        END IF;
    END LOOP;
END $$;

-- =====================================================================
-- SECTION 9: Add created_by for audit trail (不添加外键)
-- =====================================================================

DO $$ 
DECLARE
    target_tables text[] := ARRAY[
        'billing_milestones', 'change_orders', 'deficiencies', 
        'estimates', 'time_entries', 'transactions'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY target_tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS created_by uuid', t);
            RAISE NOTICE 'Added created_by to table: %', t;
        END IF;
    END LOOP;
END $$;
