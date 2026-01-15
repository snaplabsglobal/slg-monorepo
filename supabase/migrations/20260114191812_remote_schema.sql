-- JobSite Snap Core Infrastructure (Multi-tenant for Holding/Tech/LedgerSnap)




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."entry_source_enum" AS ENUM (
    'ocr',
    'manual',
    'bank'
);


ALTER TYPE "public"."entry_source_enum" OWNER TO "postgres";


CREATE TYPE "public"."expense_type_enum" AS ENUM (
    'business',
    'personal',
    'mixed'
);


ALTER TYPE "public"."expense_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."payment_status_enum" AS ENUM (
    'unpaid',
    'paid',
    'partial'
);


ALTER TYPE "public"."payment_status_enum" OWNER TO "postgres";


CREATE TYPE "public"."transaction_direction" AS ENUM (
    'income',
    'expense'
);


ALTER TYPE "public"."transaction_direction" OWNER TO "postgres";


CREATE TYPE "public"."transaction_status" AS ENUM (
    'pending',
    'verified',
    'void'
);


ALTER TYPE "public"."transaction_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    hours := duration_minutes / 60.0;
    
    IF hours <= 8 THEN
        cost := hours * hourly_rate;
    ELSIF hours <= 12 THEN
        cost := (8 * hourly_rate) + ((hours - 8) * hourly_rate * 1.5);
    ELSE
        cost := (8 * hourly_rate) + (4 * hourly_rate * 1.5) + ((hours - 12) * hourly_rate * 2.0);
    END IF;
    
    RETURN ROUND(cost, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean DEFAULT false) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    hours := duration_minutes / 60.0;
    
    IF NOT overtime_enabled THEN
        RETURN ROUND(hours * hourly_rate, 2);
    END IF;

    -- BC Rules
    IF hours <= 8 THEN
        cost := hours * hourly_rate;
    ELSIF hours <= 12 THEN
        cost := (8 * hourly_rate) + ((hours - 8) * hourly_rate * 1.5);
    ELSE
        cost := (8 * hourly_rate) + (4 * hourly_rate * 1.5) + ((hours - 12) * hourly_rate * 2.0);
    END IF;
    
    RETURN ROUND(cost, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean DEFAULT false, "is_diy_hero" boolean DEFAULT false) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    -- DIY Hero = Free Labor (Sweat Equity is tracked as hours, but Cost is 0)
    IF is_diy_hero THEN
        RETURN 0;
    END IF;

    hours := duration_minutes / 60.0;
    
    IF NOT overtime_enabled THEN
        RETURN ROUND(hours * hourly_rate, 2);
    END IF;

    -- BC Rules: >8h=1.5x, >12h=2.0x
    IF hours <= 8 THEN
        cost := hours * hourly_rate;
    ELSIF hours <= 12 THEN
        cost := (8 * hourly_rate) + ((hours - 8) * hourly_rate * 1.5);
    ELSE
        cost := (8 * hourly_rate) + (4 * hourly_rate * 1.5) + ((hours - 12) * hourly_rate * 2.0);
    END IF;
    
    RETURN ROUND(cost, 2);
END;
$$;


ALTER FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    new_org_id UUID;
BEGIN
    -- 第一步：在 profiles 表中自动创建记录
    INSERT INTO public.profiles (id, email, full_name, avatar_url, persona)
    VALUES (
        new.id, 
        new.email, 
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'avatar_url',
        'General' -- 初始默认画像
    );

    -- 第二步：为新用户创建一个默认的“个人工作区”组织
    INSERT INTO public.organizations (name, owner_id, plan)
    VALUES (
        COALESCE(new.raw_user_meta_data->>'full_name', 'My Workspace'), 
        new.id, 
        'Free'
    )
    RETURNING id INTO new_org_id;

    -- 第三步：将该用户设为该组织的 Owner
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (new_org_id, new.id, 'Owner');

    RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."billing_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "milestone_name" "text" NOT NULL,
    "percentage" numeric(5,2),
    "amount" numeric(15,2),
    "status" "text" DEFAULT 'pending'::"text",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "billing_milestones_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'invoiced'::"text", 'paid'::"text"])))
);


ALTER TABLE "public"."billing_milestones" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."change_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "amount_change" numeric(15,2) DEFAULT 0.00,
    "status" "text" DEFAULT 'draft'::"text",
    "client_signature_url" "text",
    "signed_at" timestamp with time zone,
    "formatted_id" "text" GENERATED ALWAYS AS (((SUBSTRING("title" FROM 1 FOR 3) || '-'::"text") || SUBSTRING(("id")::"text" FROM 1 FOR 4))) STORED,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "change_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_signature'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."change_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."deficiencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "photo_before_url" "text",
    "photo_after_url" "text",
    "assigned_to" "uuid",
    "resolved_at" timestamp with time zone,
    "status" "text" DEFAULT 'open'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "deficiencies_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'critical'::"text"]))),
    CONSTRAINT "deficiencies_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."deficiencies" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "hourly_rate" numeric(10,2) DEFAULT 0.00,
    "role" "text",
    "is_active" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "overtime_enabled" boolean DEFAULT false,
    "ot_multiplier" numeric(3,2) DEFAULT 1.0,
    "is_diy_hero" boolean DEFAULT false,
    "phone" "text",
    "address_line1" "text",
    "city" "text",
    "postal_code" "text",
    "emergency_contact" "jsonb"
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'Member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Member'::"text", 'Uploader'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "plan" "text" DEFAULT 'Free'::"text",
    "owner_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "plan_type" "text" DEFAULT 'free'::"text",
    "usage_metadata" "jsonb" DEFAULT '{"project_limit": 1, "receipt_count": 0}'::"jsonb",
    "primary_phone" "text",
    "primary_email" "text",
    "physical_address" "text",
    CONSTRAINT "organizations_plan_check" CHECK (("plan" = ANY (ARRAY['Free'::"text", 'LS Pro'::"text", 'JSS Base'::"text", 'Team'::"text", 'Enterprise'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payrolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "gross_pay" numeric(15,2) DEFAULT 0,
    "net_pay" numeric(15,2) DEFAULT 0,
    "bonus" numeric(15,2) DEFAULT 0,
    "transaction_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."payrolls" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "persona" "text" DEFAULT 'General'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_persona_check" CHECK (("persona" = ANY (ARRAY['Construction'::"text", 'Worker'::"text", 'Individual'::"text", 'General'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "name" "text" NOT NULL,
    "address" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_diy" boolean DEFAULT false,
    "client_org_id" "uuid",
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Archived'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid",
    "employee_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "break_duration" integer DEFAULT 0,
    "period_date" "date" GENERATED ALWAYS AS ((("start_time" AT TIME ZONE 'UTC'::"text"))::"date") STORED,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_positive_duration" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "source_app" "text",
    "transaction_date" "date" NOT NULL,
    "direction" "text" DEFAULT 'expense'::"text",
    "total_amount" numeric(15,2) NOT NULL,
    "currency" "text" DEFAULT 'CAD'::"text",
    "exchange_rate" numeric(10,5) DEFAULT 1.0,
    "base_amount" numeric(15,2) GENERATED ALWAYS AS (("total_amount" * "exchange_rate")) STORED,
    "tax_amount" numeric(15,2),
    "tax_details" "jsonb",
    "is_tax_deductible" boolean DEFAULT true,
    "deductible_rate" numeric(3,2) DEFAULT 1.0,
    "category_user" "text",
    "category_tax" "text",
    "expense_type" "text" DEFAULT 'business'::"text",
    "is_capital_asset" boolean DEFAULT false,
    "vendor_name" "text",
    "attachment_url" "text",
    "image_hash" "text",
    "entry_source" "text" DEFAULT 'ocr'::"text",
    "ai_confidence" numeric(3,2),
    "status" "text" DEFAULT 'pending'::"text",
    "payment_status" "text" DEFAULT 'paid'::"text",
    "is_reimbursable" boolean DEFAULT false,
    "needs_review" boolean DEFAULT false,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "internal_notes" "text",
    "raw_data" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "subcontractor_id" "uuid",
    CONSTRAINT "transactions_direction_check" CHECK (("direction" = ANY (ARRAY['income'::"text", 'expense'::"text"])))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."project_financials_summary" AS
 WITH "material_costs" AS (
         SELECT "transactions"."project_id",
            COALESCE("sum"("transactions"."total_amount"), (0)::numeric) AS "total_materials"
           FROM "public"."transactions"
          WHERE (("transactions"."direction" = 'expense'::"text") AND ("transactions"."project_id" IS NOT NULL))
          GROUP BY "transactions"."project_id"
        ), "labor_costs" AS (
         SELECT "te"."project_id",
            COALESCE("sum"("public"."calculate_bc_labor_cost"(((EXTRACT(epoch FROM ("te"."end_time" - "te"."start_time")) / (60)::numeric) - ("te"."break_duration")::numeric), "e"."hourly_rate", "e"."overtime_enabled", "e"."is_diy_hero")), (0)::numeric) AS "total_labor",
            COALESCE("sum"((EXTRACT(epoch FROM ("te"."end_time" - "te"."start_time")) / (3600)::numeric)), (0)::numeric) AS "total_hours"
           FROM ("public"."time_entries" "te"
             JOIN "public"."employees" "e" ON (("te"."employee_id" = "e"."id")))
          GROUP BY "te"."project_id"
        )
 SELECT "p"."id" AS "project_id",
    "p"."name" AS "project_name",
    COALESCE("m"."total_materials", (0)::numeric) AS "cost_materials",
    COALESCE("l"."total_labor", (0)::numeric) AS "cost_labor",
    COALESCE("l"."total_hours", (0)::numeric) AS "total_hours_worked",
    (COALESCE("m"."total_materials", (0)::numeric) + COALESCE("l"."total_labor", (0)::numeric)) AS "total_project_cost"
   FROM (("public"."projects" "p"
     LEFT JOIN "material_costs" "m" ON (("p"."id" = "m"."project_id")))
     LEFT JOIN "labor_costs" "l" ON (("p"."id" = "l"."project_id")));


ALTER VIEW "public"."project_financials_summary" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "asset_type" "text" NOT NULL,
    "file_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."property_assets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."safety_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "log_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "conducted_by" "uuid",
    "checklist_data" "jsonb" DEFAULT '{}'::"jsonb",
    "weather_notes" "text",
    "incident_reported" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."safety_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."subcontractors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "org_id" "uuid" NOT NULL,
    "company_name" "text" NOT NULL,
    "business_number" "text",
    "gst_number" "text",
    "sub_type" "text",
    "payment_terms" "text" DEFAULT 'Net 15'::"text",
    "contact_name" "text",
    "contact_email" "text",
    "contact_phone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_contact_name" "text",
    "email" "text",
    "phone" "text",
    "billing_address" "text",
    "legal_name" "text",
    "recipient_type" "text" DEFAULT 'Corporation'::"text",
    "gst_verified_at" timestamp with time zone,
    CONSTRAINT "subcontractors_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['Individual'::"text", 'Corporation'::"text", 'Partnership'::"text", 'Trust'::"text"])))
);


ALTER TABLE "public"."subcontractors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(15,2),
    "unit_price" numeric(15,2),
    "amount" numeric(15,2),
    "category_tax" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transaction_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid",
    "alias" "text" NOT NULL,
    "resolved_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendor_aliases" OWNER TO "postgres";


ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_assets"
    ADD CONSTRAINT "property_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_organization_id_alias_key" UNIQUE ("organization_id", "alias");



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_billing_milestones_project" ON "public"."billing_milestones" USING "btree" ("project_id");



CREATE INDEX "idx_change_orders_project" ON "public"."change_orders" USING "btree" ("project_id");



CREATE INDEX "idx_deficiencies_assignee" ON "public"."deficiencies" USING "btree" ("assigned_to");



CREATE INDEX "idx_deficiencies_project" ON "public"."deficiencies" USING "btree" ("project_id");



CREATE INDEX "idx_property_assets_org" ON "public"."property_assets" USING "btree" ("org_id");



CREATE INDEX "idx_transactions_org" ON "public"."transactions" USING "btree" ("org_id");



CREATE INDEX "idx_transactions_project" ON "public"."transactions" USING "btree" ("project_id");



CREATE INDEX "idx_transactions_subcontractor" ON "public"."transactions" USING "btree" ("subcontractor_id");



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_org_id_fkey" FOREIGN KEY ("client_org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_assets"
    ADD CONSTRAINT "property_assets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_conducted_by_fkey" FOREIGN KEY ("conducted_by") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_subcontractor_id_fkey" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_aliases" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."billing_milestones" TO "anon";
GRANT ALL ON TABLE "public"."billing_milestones" TO "authenticated";
GRANT ALL ON TABLE "public"."billing_milestones" TO "service_role";



GRANT ALL ON TABLE "public"."change_orders" TO "anon";
GRANT ALL ON TABLE "public"."change_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."change_orders" TO "service_role";



GRANT ALL ON TABLE "public"."deficiencies" TO "anon";
GRANT ALL ON TABLE "public"."deficiencies" TO "authenticated";
GRANT ALL ON TABLE "public"."deficiencies" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."payrolls" TO "anon";
GRANT ALL ON TABLE "public"."payrolls" TO "authenticated";
GRANT ALL ON TABLE "public"."payrolls" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."project_financials_summary" TO "anon";
GRANT ALL ON TABLE "public"."project_financials_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."project_financials_summary" TO "service_role";



GRANT ALL ON TABLE "public"."property_assets" TO "anon";
GRANT ALL ON TABLE "public"."property_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."property_assets" TO "service_role";



GRANT ALL ON TABLE "public"."safety_logs" TO "anon";
GRANT ALL ON TABLE "public"."safety_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_logs" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractors" TO "anon";
GRANT ALL ON TABLE "public"."subcontractors" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractors" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_items" TO "anon";
GRANT ALL ON TABLE "public"."transaction_items" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_items" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_aliases" TO "anon";
GRANT ALL ON TABLE "public"."vendor_aliases" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_aliases" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Admins can delete receipts"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'receipt-images'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM public.organization_members
  WHERE ((organization_members.user_id = auth.uid()) AND (organization_members.role = ANY (ARRAY['Owner'::text, 'Admin'::text])))))));



  create policy "Users can upload to their org folder"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'receipt-images'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));



  create policy "Users can view receipts in their org folder"
  on "storage"."objects"
  as permissive
  for select
  to public
using (((bucket_id = 'receipt-images'::text) AND ((storage.foldername(name))[1] IN ( SELECT (organization_members.organization_id)::text AS organization_id
   FROM public.organization_members
  WHERE (organization_members.user_id = auth.uid())))));


-- CREATE TRIGGER ai_parsing_trigger AFTER INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://zqbudwdlwogimrzdmduq.supabase.co/functions/v1/receipt-processor ', 'POST', '{"Content-type":"application/json","Bearer":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpxYnVkd2Rsd29naW1yemRtZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNjc4NjcsImV4cCI6MjA4MzY0Mzg2N30.EhItbmW4dnYmiSuCeuX-u6xF5roPtIzCGWrH9fd9thE"}', '{}', '5000');
-- 
-- CREATE TRIGGER process_on_upload AFTER INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION supabase_functions.http_request('https://zqbudwdlwogimrzdmduq.supabase.co/functions/v1/receipt-processor ', 'POST', '{"Content-type":"application/json"}', '{}', '5000');
