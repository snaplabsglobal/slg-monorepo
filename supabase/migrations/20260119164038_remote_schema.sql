


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


CREATE OR REPLACE FUNCTION "public"."audit_trigger_func"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO audit_logs (
    organization_id,
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_by
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."audit_trigger_func"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_base_amount"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.base_amount := NEW.total_amount * COALESCE(NEW.exchange_rate, 1.0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_base_amount"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean DEFAULT false, "is_diy_hero" boolean DEFAULT false) RETURNS numeric
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
DECLARE
    hours numeric;
    cost numeric := 0;
BEGIN
    -- DIY Hero (Sweat Equity) = 0 Cost
    IF is_diy_hero THEN RETURN 0; END IF;

    hours := duration_minutes / 60.0;
    
    IF NOT overtime_enabled THEN
        RETURN ROUND(hours * hourly_rate, 2);
    END IF;

    -- BC Employment Standards Act Logic
    -- 0-8 hrs: 1.0x
    -- 8-12 hrs: 1.5x
    -- >12 hrs: 2.0x
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


CREATE OR REPLACE FUNCTION "public"."check_time_entry_overlap"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM time_entries
    WHERE employee_id = NEW.employee_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND (NEW.start_time, NEW.end_time) OVERLAPS (start_time, end_time)
  ) THEN
    RAISE EXCEPTION 'Time entries cannot overlap for the same employee';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_time_entry_overlap"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_transaction_items_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  items_total numeric;
  trans_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO items_total
  FROM transaction_items 
  WHERE transaction_id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  SELECT total_amount INTO trans_total
  FROM transactions 
  WHERE id = COALESCE(NEW.transaction_id, OLD.transaction_id);
  
  IF items_total != trans_total THEN
    RAISE EXCEPTION 'Transaction items sum (%) must equal transaction total (%)', items_total, trans_total;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."check_transaction_items_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."convert_currency"("p_amount" numeric, "p_from_currency" "text", "p_to_currency" "text", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  SELECT p_amount * COALESCE(
    get_exchange_rate(p_from_currency, p_to_currency, p_date),
    1.0
  );
$$;


ALTER FUNCTION "public"."convert_currency"("p_amount" numeric, "p_from_currency" "text", "p_to_currency" "text", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_org_has_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.role = 'Owner' AND NEW.role != 'Owner' THEN
    IF (SELECT COUNT(*) FROM organization_members 
        WHERE organization_id = NEW.organization_id 
        AND role = 'Owner' 
        AND id != NEW.id) = 0 THEN
      RAISE EXCEPTION 'Organization must have at least one owner';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' AND OLD.role = 'Owner' THEN
    IF (SELECT COUNT(*) FROM organization_members 
        WHERE organization_id = OLD.organization_id 
        AND role = 'Owner' 
        AND id != OLD.id) = 0 THEN
      RAISE EXCEPTION 'Cannot delete the last owner';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."ensure_org_has_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_date" "date" DEFAULT CURRENT_DATE) RETURNS numeric
    LANGUAGE "sql" STABLE
    AS $$
  SELECT rate FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_admin"("org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('Owner', 'Admin')
  );
$$;


ALTER FUNCTION "public"."is_org_admin"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_org_member"("org_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_org_member"("org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_project_financials"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_financials;
END;
$$;


ALTER FUNCTION "public"."refresh_project_financials"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_in_organization"("org_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_uuid
        AND user_id = auth.uid()
    );
$$;


ALTER FUNCTION "public"."user_in_organization"("org_uuid" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "table_name" "text" NOT NULL,
    "record_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "ip_address" "inet",
    "user_agent" "text",
    CONSTRAINT "audit_logs_action_check" CHECK (("action" = ANY (ARRAY['INSERT'::"text", 'UPDATE'::"text", 'DELETE'::"text"])))
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."billing_milestones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid" NOT NULL,
    "milestone_name" "text" NOT NULL,
    "percentage" numeric(5,2),
    "amount" numeric(15,2),
    "status" "text" DEFAULT 'pending'::"text",
    "due_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "invoice_number" "text",
    "invoiced_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "billing_milestones_non_negative_amount" CHECK ((("amount" IS NULL) OR ("amount" >= (0)::numeric))),
    CONSTRAINT "billing_milestones_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'invoiced'::"text", 'paid'::"text"]))),
    CONSTRAINT "billing_milestones_valid_percentage" CHECK ((("percentage" IS NULL) OR (("percentage" >= (0)::numeric) AND ("percentage" <= (100)::numeric)))),
    CONSTRAINT "check_milestone_has_value" CHECK ((("percentage" IS NOT NULL) OR ("amount" IS NOT NULL))),
    CONSTRAINT "check_milestone_value" CHECK ((("percentage" IS NOT NULL) OR ("amount" IS NOT NULL)))
);


ALTER TABLE "public"."billing_milestones" OWNER TO "postgres";


COMMENT ON TABLE "public"."billing_milestones" IS 'Tracks project billing milestones and payment schedules';



CREATE TABLE IF NOT EXISTS "public"."change_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
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
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "change_orders_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_signature'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."change_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."change_orders" IS 'Manages project scope changes and associated costs';



CREATE TABLE IF NOT EXISTS "public"."deficiencies" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
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
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "deficiencies_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'critical'::"text"]))),
    CONSTRAINT "deficiencies_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'resolved'::"text"])))
);


ALTER TABLE "public"."deficiencies" OWNER TO "postgres";


COMMENT ON TABLE "public"."deficiencies" IS 'Tracks quality issues and items needing correction';



CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "hourly_rate" numeric(10,2) DEFAULT 0.00,
    "role" "text",
    "is_active" boolean DEFAULT true,
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "overtime_enabled" boolean DEFAULT false,
    "ot_multiplier" numeric(5,2) DEFAULT 1.0,
    "is_diy_hero" boolean DEFAULT false,
    "phone" "text",
    "address_line1" "text",
    "city" "text",
    "postal_code" "text",
    "emergency_contact" "jsonb",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "employees_non_negative_rate" CHECK (("hourly_rate" >= (0)::numeric)),
    CONSTRAINT "employees_valid_ot_multiplier" CHECK (("ot_multiplier" >= 1.0))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON TABLE "public"."employees" IS 'Employee records with hourly rates and contact information';



CREATE TABLE IF NOT EXISTS "public"."exchange_rates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_currency" "text" NOT NULL,
    "to_currency" "text" NOT NULL,
    "rate" numeric NOT NULL,
    "effective_date" "date" NOT NULL,
    "source" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_effective_date" CHECK (("effective_date" <= CURRENT_DATE)),
    CONSTRAINT "exchange_rates_rate_check" CHECK (("rate" > (0)::numeric))
);


ALTER TABLE "public"."exchange_rates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."i18n_translations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "lang" "text" NOT NULL,
    "translation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."i18n_translations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'Member'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['Owner'::"text", 'Admin'::"text", 'Member'::"text", 'Uploader'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_members" IS 'User memberships and roles within organizations';



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
    "default_language" "text" DEFAULT 'en'::"text",
    CONSTRAINT "organizations_plan_check" CHECK (("plan" = ANY (ARRAY['Free'::"text", 'LS Pro'::"text", 'JSS Base'::"text", 'Team'::"text", 'Enterprise'::"text"])))
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organizations" IS 'Top-level organization/company accounts';



CREATE TABLE IF NOT EXISTS "public"."payrolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "gross_pay" numeric(15,2) DEFAULT 0,
    "net_pay" numeric(15,2) DEFAULT 0,
    "bonus" numeric(15,2) DEFAULT 0,
    "transaction_id" "uuid",
    "status" "text" DEFAULT 'draft'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_payroll_period" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "check_payroll_period_valid" CHECK (("period_end" > "period_start")),
    CONSTRAINT "payrolls_period_range_chk" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "payrolls_period_valid_chk" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "payrolls_valid_period" CHECK (("period_end" >= "period_start"))
);


ALTER TABLE "public"."payrolls" OWNER TO "postgres";


COMMENT ON TABLE "public"."payrolls" IS 'Payroll records for employee compensation';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "persona" "text" DEFAULT 'General'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "language_code" "text" DEFAULT 'en'::"text",
    CONSTRAINT "profiles_persona_check" CHECK (("persona" = ANY (ARRAY['Construction'::"text", 'Worker'::"text", 'Individual'::"text", 'General'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profile information and preferences';



CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "address" "text",
    "status" "text" DEFAULT 'Active'::"text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "is_diy" boolean DEFAULT false,
    "client_organization_id" "uuid",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "projects_status_check" CHECK (("status" = ANY (ARRAY['Active'::"text", 'Archived'::"text"])))
);


ALTER TABLE "public"."projects" OWNER TO "postgres";


COMMENT ON TABLE "public"."projects" IS 'Main project records for tracking construction work';



CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "project_id" "uuid",
    "user_id" "uuid",
    "source_app" "text",
    "transaction_date" "date" NOT NULL,
    "direction" "text" DEFAULT 'expense'::"text",
    "total_amount" numeric(15,2) NOT NULL,
    "currency" "text" DEFAULT 'CAD'::"text",
    "exchange_rate" numeric(10,6) DEFAULT 1.0,
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
    "deleted_at" timestamp with time zone,
    "created_by" "uuid",
    "original_currency" "text" DEFAULT 'CAD'::"text",
    "base_currency" "text" DEFAULT 'CAD'::"text",
    "exchange_rate_source" "text",
    "exchange_rate_date" "date",
    "deleted_by" "uuid",
    "base_amount" numeric GENERATED ALWAYS AS (("total_amount" * COALESCE("exchange_rate", 1.0))) STORED,
    CONSTRAINT "transactions_direction_check" CHECK (("direction" = ANY (ARRAY['income'::"text", 'expense'::"text"]))),
    CONSTRAINT "transactions_non_negative_amount" CHECK (("total_amount" >= (0)::numeric)),
    CONSTRAINT "transactions_non_negative_tax" CHECK ((("tax_amount" IS NULL) OR ("tax_amount" >= (0)::numeric))),
    CONSTRAINT "transactions_valid_exchange_rate" CHECK (("exchange_rate" > (0)::numeric))
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."transactions" IS 'Financial transactions including income and expenses';



CREATE MATERIALIZED VIEW "public"."project_financials" AS
 SELECT "p"."id" AS "project_id",
    "p"."organization_id",
    "p"."name",
    "p"."status",
    COALESCE("sum"(
        CASE
            WHEN ("t"."direction" = 'income'::"text") THEN "t"."base_amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_income",
    COALESCE("sum"(
        CASE
            WHEN ("t"."direction" = 'expense'::"text") THEN "t"."base_amount"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_expenses",
    COALESCE("sum"(
        CASE
            WHEN ("t"."direction" = 'income'::"text") THEN "t"."base_amount"
            ELSE (- "t"."base_amount")
        END), (0)::numeric) AS "net_profit",
    "count"(DISTINCT "t"."id") AS "transaction_count"
   FROM ("public"."projects" "p"
     LEFT JOIN "public"."transactions" "t" ON ((("t"."project_id" = "p"."id") AND ("t"."deleted_at" IS NULL))))
  WHERE ("p"."deleted_at" IS NULL)
  GROUP BY "p"."id", "p"."organization_id", "p"."name", "p"."status"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."project_financials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."property_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "asset_type" "text" NOT NULL,
    "file_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "project_id" "uuid"
);


ALTER TABLE "public"."property_assets" OWNER TO "postgres";


COMMENT ON TABLE "public"."property_assets" IS 'Digital assets and documents related to properties';



CREATE TABLE IF NOT EXISTS "public"."rate_limits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "endpoint" "text",
    "request_count" integer DEFAULT 1,
    "window_start" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."safety_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
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


COMMENT ON TABLE "public"."safety_logs" IS 'Daily safety inspection logs and incident reports';



CREATE TABLE IF NOT EXISTS "public"."subcontractors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
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
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    CONSTRAINT "subcontractors_recipient_type_check" CHECK (("recipient_type" = ANY (ARRAY['Individual'::"text", 'Corporation'::"text", 'Partnership'::"text", 'Trust'::"text"])))
);


ALTER TABLE "public"."subcontractors" OWNER TO "postgres";


COMMENT ON TABLE "public"."subcontractors" IS 'Third-party contractor information and contact details';



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
    "created_by" "uuid",
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "check_positive_duration" CHECK (("end_time" > "start_time")),
    CONSTRAINT "check_time_entry_valid" CHECK (("end_time" > "start_time")),
    CONSTRAINT "check_time_valid" CHECK (("end_time" > "start_time")),
    CONSTRAINT "time_entries_valid_break" CHECK (("break_duration" >= 0)),
    CONSTRAINT "time_entries_valid_time_range" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."time_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."time_entries" IS 'Employee time tracking for labor costing';



CREATE TABLE IF NOT EXISTS "public"."transaction_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "description" "text",
    "quantity" numeric(10,3),
    "unit_price" numeric(15,2),
    "category_tax" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "amount" numeric GENERATED ALWAYS AS ((COALESCE("quantity", (0)::numeric) * COALESCE("unit_price", (0)::numeric))) STORED,
    CONSTRAINT "transaction_items_non_negative_price" CHECK ((("unit_price" IS NULL) OR ("unit_price" >= (0)::numeric))),
    CONSTRAINT "transaction_items_non_negative_qty" CHECK ((("quantity" IS NULL) OR ("quantity" >= (0)::numeric)))
);


ALTER TABLE "public"."transaction_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."transaction_items" IS 'Line items breaking down transaction details';



CREATE TABLE IF NOT EXISTS "public"."vendor_aliases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "alias" "text" NOT NULL,
    "resolved_name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vendor_aliases" OWNER TO "postgres";


COMMENT ON TABLE "public"."vendor_aliases" IS 'Vendor name normalization mappings';



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_org_id_id_key" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_org_id_id_uniq" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_from_currency_to_currency_effective_date_key" UNIQUE ("from_currency", "to_currency", "effective_date");



ALTER TABLE ONLY "public"."exchange_rates"
    ADD CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."i18n_translations"
    ADD CONSTRAINT "i18n_translations_key_lang_key" UNIQUE ("key", "lang");



ALTER TABLE ONLY "public"."i18n_translations"
    ADD CONSTRAINT "i18n_translations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_user_uniq" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_org_id_id_key" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_org_id_id_uniq" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."property_assets"
    ADD CONSTRAINT "property_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rate_limits"
    ADD CONSTRAINT "rate_limits_user_id_endpoint_window_start_key" UNIQUE ("user_id", "endpoint", "window_start");



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_org_id_id_key" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_org_id_id_uniq" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_org_id_id_key" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_org_id_id_uniq" UNIQUE ("organization_id", "id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_organization_id_alias_key" UNIQUE ("organization_id", "alias");



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_logs_changed_by" ON "public"."audit_logs" USING "btree" ("changed_by", "changed_at" DESC);



CREATE INDEX "idx_audit_logs_org" ON "public"."audit_logs" USING "btree" ("organization_id", "changed_at" DESC);



CREATE INDEX "idx_audit_logs_org_table" ON "public"."audit_logs" USING "btree" ("organization_id", "table_name", "changed_at" DESC);



CREATE INDEX "idx_audit_logs_record" ON "public"."audit_logs" USING "btree" ("record_id", "changed_at" DESC);



CREATE INDEX "idx_billing_milestones_due_date" ON "public"."billing_milestones" USING "btree" ("due_date") WHERE (("due_date" IS NOT NULL) AND ("status" <> 'paid'::"text"));



CREATE INDEX "idx_billing_milestones_org" ON "public"."billing_milestones" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_billing_milestones_org_id" ON "public"."billing_milestones" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_billing_milestones_org_project" ON "public"."billing_milestones" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_billing_milestones_project" ON "public"."billing_milestones" USING "btree" ("project_id");



CREATE INDEX "idx_billing_milestones_project_id" ON "public"."billing_milestones" USING "btree" ("project_id", "status");



CREATE INDEX "idx_billing_milestones_status" ON "public"."billing_milestones" USING "btree" ("status") WHERE ("status" <> 'paid'::"text");



CREATE INDEX "idx_change_orders_org" ON "public"."change_orders" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_change_orders_org_id" ON "public"."change_orders" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_change_orders_org_project" ON "public"."change_orders" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_change_orders_project" ON "public"."change_orders" USING "btree" ("project_id");



CREATE INDEX "idx_change_orders_status" ON "public"."change_orders" USING "btree" ("status") WHERE ("status" <> 'rejected'::"text");



CREATE INDEX "idx_deficiencies_assigned" ON "public"."deficiencies" USING "btree" ("assigned_to") WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_deficiencies_assigned_to" ON "public"."deficiencies" USING "btree" ("assigned_to") WHERE ("status" = 'open'::"text");



CREATE INDEX "idx_deficiencies_assignee" ON "public"."deficiencies" USING "btree" ("assigned_to");



CREATE INDEX "idx_deficiencies_org_assigned" ON "public"."deficiencies" USING "btree" ("organization_id", "assigned_to");



CREATE INDEX "idx_deficiencies_org_project" ON "public"."deficiencies" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_deficiencies_project" ON "public"."deficiencies" USING "btree" ("project_id");



CREATE INDEX "idx_deficiencies_project_id" ON "public"."deficiencies" USING "btree" ("project_id", "status");



CREATE INDEX "idx_deficiencies_status_priority" ON "public"."deficiencies" USING "btree" ("status", "priority");



CREATE INDEX "idx_employees_active" ON "public"."employees" USING "btree" ("organization_id", "is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_org" ON "public"."employees" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_employees_org_active" ON "public"."employees" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_employees_org_date" ON "public"."employees" USING "btree" ("organization_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_org_id" ON "public"."employees" USING "btree" ("organization_id");



CREATE INDEX "idx_employees_org_user" ON "public"."employees" USING "btree" ("organization_id", "user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_employees_user" ON "public"."employees" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_exchange_rates_lookup" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency", "effective_date" DESC);



CREATE UNIQUE INDEX "idx_exchange_rates_unique" ON "public"."exchange_rates" USING "btree" ("from_currency", "to_currency", "effective_date");



CREATE UNIQUE INDEX "idx_i18n_translations_unique" ON "public"."i18n_translations" USING "btree" ("key", "lang");



CREATE INDEX "idx_org_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE INDEX "idx_org_members_org_id" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_org_members_org_user" ON "public"."organization_members" USING "btree" ("organization_id", "user_id");



CREATE UNIQUE INDEX "idx_org_members_unique" ON "public"."organization_members" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_org_members_user" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_org_members_user_id" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_organization_members_org" ON "public"."organization_members" USING "btree" ("organization_id");



CREATE UNIQUE INDEX "idx_organization_members_unique" ON "public"."organization_members" USING "btree" ("organization_id", "user_id");



CREATE INDEX "idx_organization_members_user" ON "public"."organization_members" USING "btree" ("user_id");



CREATE INDEX "idx_payrolls_employee" ON "public"."payrolls" USING "btree" ("employee_id", "period_start" DESC);



CREATE INDEX "idx_payrolls_employee_id" ON "public"."payrolls" USING "btree" ("employee_id", "period_start" DESC);



CREATE INDEX "idx_payrolls_org" ON "public"."payrolls" USING "btree" ("organization_id", "period_start" DESC);



CREATE INDEX "idx_payrolls_org_employee" ON "public"."payrolls" USING "btree" ("organization_id", "employee_id");



CREATE INDEX "idx_payrolls_org_id" ON "public"."payrolls" USING "btree" ("organization_id");



CREATE INDEX "idx_payrolls_org_period" ON "public"."payrolls" USING "btree" ("organization_id", "period_start" DESC, "period_end" DESC);



CREATE INDEX "idx_payrolls_org_txn" ON "public"."payrolls" USING "btree" ("organization_id", "transaction_id");



CREATE INDEX "idx_payrolls_period" ON "public"."payrolls" USING "btree" ("period_start" DESC, "period_end" DESC);



CREATE INDEX "idx_payrolls_status" ON "public"."payrolls" USING "btree" ("status") WHERE ("status" = 'draft'::"text");



CREATE UNIQUE INDEX "idx_profiles_email_unique" ON "public"."profiles" USING "btree" ("lower"("email")) WHERE ("email" IS NOT NULL);



CREATE UNIQUE INDEX "idx_project_financials_id" ON "public"."project_financials" USING "btree" ("project_id");



CREATE INDEX "idx_project_financials_org" ON "public"."project_financials" USING "btree" ("organization_id");



CREATE INDEX "idx_projects_client" ON "public"."projects" USING "btree" ("client_organization_id") WHERE ("client_organization_id" IS NOT NULL);



CREATE INDEX "idx_projects_client_org" ON "public"."projects" USING "btree" ("client_organization_id") WHERE ("client_organization_id" IS NOT NULL);



CREATE INDEX "idx_projects_metadata" ON "public"."projects" USING "gin" ("metadata");



CREATE INDEX "idx_projects_metadata_gin" ON "public"."projects" USING "gin" ("metadata");



CREATE INDEX "idx_projects_org" ON "public"."projects" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_org_date" ON "public"."projects" USING "btree" ("organization_id", "created_at" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_org_id" ON "public"."projects" USING "btree" ("organization_id");



CREATE INDEX "idx_projects_org_status" ON "public"."projects" USING "btree" ("organization_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_projects_status" ON "public"."projects" USING "btree" ("organization_id", "status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_property_assets_org" ON "public"."property_assets" USING "btree" ("organization_id");



CREATE INDEX "idx_property_assets_org_project" ON "public"."property_assets" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_property_assets_project" ON "public"."property_assets" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_property_assets_project_id" ON "public"."property_assets" USING "btree" ("project_id");



CREATE INDEX "idx_rate_limits_ip" ON "public"."rate_limits" USING "btree" ("ip_address", "endpoint", "window_start") WHERE ("ip_address" IS NOT NULL);



CREATE UNIQUE INDEX "idx_rate_limits_unique" ON "public"."rate_limits" USING "btree" ("user_id", "endpoint", "window_start") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_rate_limits_user" ON "public"."rate_limits" USING "btree" ("user_id", "endpoint", "window_start") WHERE ("user_id" IS NOT NULL);



CREATE UNIQUE INDEX "idx_rate_limits_user_endpoint" ON "public"."rate_limits" USING "btree" ("user_id", "endpoint", "window_start") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_safety_logs_date" ON "public"."safety_logs" USING "btree" ("log_date" DESC);



CREATE INDEX "idx_safety_logs_incidents" ON "public"."safety_logs" USING "btree" ("incident_reported") WHERE ("incident_reported" = true);



CREATE INDEX "idx_safety_logs_org_conducted" ON "public"."safety_logs" USING "btree" ("organization_id", "conducted_by");



CREATE INDEX "idx_safety_logs_org_project" ON "public"."safety_logs" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_safety_logs_project" ON "public"."safety_logs" USING "btree" ("project_id", "log_date" DESC);



CREATE INDEX "idx_safety_logs_project_date" ON "public"."safety_logs" USING "btree" ("project_id", "log_date" DESC);



CREATE INDEX "idx_subcontractors_active" ON "public"."subcontractors" USING "btree" ("organization_id", "is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_subcontractors_company_name" ON "public"."subcontractors" USING "btree" ("organization_id", "company_name");



CREATE INDEX "idx_subcontractors_org" ON "public"."subcontractors" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_subcontractors_org_active" ON "public"."subcontractors" USING "btree" ("organization_id") WHERE ("is_active" = true);



CREATE INDEX "idx_subcontractors_org_id" ON "public"."subcontractors" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_time_entries_created_by" ON "public"."time_entries" USING "btree" ("created_by");



CREATE INDEX "idx_time_entries_date" ON "public"."time_entries" USING "btree" ("period_date" DESC, "employee_id");



CREATE INDEX "idx_time_entries_emp_project" ON "public"."time_entries" USING "btree" ("employee_id", "project_id", "period_date");



CREATE INDEX "idx_time_entries_employee" ON "public"."time_entries" USING "btree" ("employee_id", "period_date" DESC);



CREATE INDEX "idx_time_entries_org" ON "public"."time_entries" USING "btree" ("organization_id");



CREATE INDEX "idx_time_entries_org_date" ON "public"."time_entries" USING "btree" ("organization_id", "period_date" DESC);



CREATE INDEX "idx_time_entries_org_employee" ON "public"."time_entries" USING "btree" ("organization_id", "employee_id");



CREATE INDEX "idx_time_entries_org_id" ON "public"."time_entries" USING "btree" ("organization_id");



CREATE INDEX "idx_time_entries_org_period" ON "public"."time_entries" USING "btree" ("organization_id", "period_date" DESC);



CREATE INDEX "idx_time_entries_org_project" ON "public"."time_entries" USING "btree" ("organization_id", "project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_time_entries_period" ON "public"."time_entries" USING "btree" ("period_date" DESC);



CREATE INDEX "idx_time_entries_project" ON "public"."time_entries" USING "btree" ("project_id") WHERE ("project_id" IS NOT NULL);



CREATE INDEX "idx_time_entries_project_id" ON "public"."time_entries" USING "btree" ("project_id", "period_date");



CREATE INDEX "idx_transaction_items_org_txn" ON "public"."transaction_items" USING "btree" ("organization_id", "transaction_id");



CREATE INDEX "idx_transaction_items_transaction" ON "public"."transaction_items" USING "btree" ("transaction_id");



CREATE INDEX "idx_transaction_items_transaction_id" ON "public"."transaction_items" USING "btree" ("transaction_id");



CREATE INDEX "idx_transactions_date" ON "public"."transactions" USING "btree" ("transaction_date");



CREATE INDEX "idx_transactions_org" ON "public"."transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_transactions_org_date" ON "public"."transactions" USING "btree" ("organization_id", "transaction_date" DESC) WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_transactions_org_id" ON "public"."transactions" USING "btree" ("organization_id");



CREATE INDEX "idx_transactions_org_project" ON "public"."transactions" USING "btree" ("organization_id", "project_id");



CREATE INDEX "idx_transactions_org_project_date" ON "public"."transactions" USING "btree" ("organization_id", "project_id", "transaction_date" DESC);



CREATE INDEX "idx_transactions_org_status" ON "public"."transactions" USING "btree" ("organization_id", "status");



CREATE INDEX "idx_transactions_project" ON "public"."transactions" USING "btree" ("project_id");



CREATE INDEX "idx_transactions_project_id" ON "public"."transactions" USING "btree" ("project_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_transactions_raw_data" ON "public"."transactions" USING "gin" ("raw_data");



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status") WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_transactions_subcontractor" ON "public"."transactions" USING "btree" ("subcontractor_id");



CREATE INDEX "idx_transactions_tax_details" ON "public"."transactions" USING "gin" ("tax_details");



CREATE INDEX "idx_transactions_tax_details_gin" ON "public"."transactions" USING "gin" ("tax_details");



CREATE INDEX "idx_transactions_user" ON "public"."transactions" USING "btree" ("user_id") WHERE ("user_id" IS NOT NULL);



CREATE INDEX "idx_transactions_vendor" ON "public"."transactions" USING "btree" ("vendor_name") WHERE (("vendor_name" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_vendor_aliases_alias" ON "public"."vendor_aliases" USING "btree" ("organization_id", "alias");



CREATE INDEX "idx_vendor_aliases_lookup" ON "public"."vendor_aliases" USING "btree" ("organization_id", "alias");



CREATE INDEX "idx_vendor_aliases_org" ON "public"."vendor_aliases" USING "btree" ("organization_id");



CREATE INDEX "idx_vendor_aliases_org_alias" ON "public"."vendor_aliases" USING "btree" ("organization_id", "alias");



CREATE UNIQUE INDEX "idx_vendor_aliases_unique" ON "public"."vendor_aliases" USING "btree" ("organization_id", "lower"("alias"));



CREATE OR REPLACE TRIGGER "audit_transactions" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_func"();



CREATE OR REPLACE TRIGGER "auto_calculate_base_amount" BEFORE INSERT OR UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_base_amount"();



CREATE OR REPLACE TRIGGER "check_owner_exists" BEFORE DELETE OR UPDATE ON "public"."organization_members" FOR EACH ROW EXECUTE FUNCTION "public"."ensure_org_has_owner"();



CREATE OR REPLACE TRIGGER "prevent_time_overlap" BEFORE INSERT OR UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."check_time_entry_overlap"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."billing_milestones" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."change_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."deficiencies" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."payrolls" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."projects" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."property_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."safety_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."subcontractors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."time_entries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "transaction_items_sum_check" AFTER INSERT OR UPDATE ON "public"."transaction_items" FOR EACH ROW EXECUTE FUNCTION "public"."check_transaction_items_total"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."billing_milestones"
    ADD CONSTRAINT "billing_milestones_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."change_orders"
    ADD CONSTRAINT "change_orders_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_assigned_to_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."deficiencies"
    ADD CONSTRAINT "deficiencies_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_employee_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payrolls"
    ADD CONSTRAINT "payrolls_transaction_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_client_org_fk" FOREIGN KEY ("client_organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."projects"
    ADD CONSTRAINT "projects_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_assets"
    ADD CONSTRAINT "property_assets_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."property_assets"
    ADD CONSTRAINT "property_assets_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_conducted_by_fk" FOREIGN KEY ("conducted_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."safety_logs"
    ADD CONSTRAINT "safety_logs_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."subcontractors"
    ADD CONSTRAINT "subcontractors_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_employee_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_entries"
    ADD CONSTRAINT "time_entries_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_transaction_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_project_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_subcontractor_fk" FOREIGN KEY ("subcontractor_id") REFERENCES "public"."subcontractors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_verified_by_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."vendor_aliases"
    ADD CONSTRAINT "vendor_aliases_org_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete projects" ON "public"."projects" FOR DELETE USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can delete time entries" ON "public"."time_entries" FOR DELETE USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can delete transactions" ON "public"."transactions" FOR DELETE USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can insert projects" ON "public"."projects" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['Owner'::"text", 'Admin'::"text"]))))));



CREATE POLICY "Admins can manage billing milestones" ON "public"."billing_milestones" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage change orders" ON "public"."change_orders" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage employees" ON "public"."employees" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage members" ON "public"."organization_members" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage payrolls" ON "public"."payrolls" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage projects" ON "public"."projects" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['Owner'::"text", 'Admin'::"text"]))))));



CREATE POLICY "Admins can manage subcontractors" ON "public"."subcontractors" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can manage vendor aliases" ON "public"."vendor_aliases" USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can update org" ON "public"."organizations" FOR UPDATE USING ("public"."is_org_admin"("id"));



CREATE POLICY "Admins can update projects" ON "public"."projects" FOR UPDATE USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can view audit logs" ON "public"."audit_logs" FOR SELECT USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Admins can view payrolls" ON "public"."payrolls" FOR SELECT USING ("public"."is_org_admin"("organization_id"));



CREATE POLICY "Allow public read access to translations" ON "public"."i18n_translations" FOR SELECT USING (true);



CREATE POLICY "Anyone can view translations" ON "public"."i18n_translations" FOR SELECT USING (true);



CREATE POLICY "Assigned can update deficiencies" ON "public"."deficiencies" FOR UPDATE USING (("public"."is_org_member"("organization_id") AND (("assigned_to" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR "public"."is_org_admin"("organization_id"))));



CREATE POLICY "Employees can create time entries" ON "public"."time_entries" FOR INSERT WITH CHECK (("public"."is_org_member"("organization_id") AND (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR "public"."is_org_admin"("organization_id"))));



CREATE POLICY "Employees can update time entries" ON "public"."time_entries" FOR UPDATE USING (("public"."is_org_member"("organization_id") AND (("employee_id" IN ( SELECT "employees"."id"
   FROM "public"."employees"
  WHERE ("employees"."user_id" = "auth"."uid"()))) OR "public"."is_org_admin"("organization_id"))));



CREATE POLICY "Hide sensitive subcontractor data" ON "public"."subcontractors" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can create deficiencies" ON "public"."deficiencies" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can create projects" ON "public"."projects" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can create transactions" ON "public"."transactions" FOR INSERT WITH CHECK ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can insert transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can manage property assets" ON "public"."property_assets" USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can manage safety logs" ON "public"."safety_logs" USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can manage transaction items" ON "public"."transaction_items" USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Members can update own transactions" ON "public"."transactions" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Members can update transactions" ON "public"."transactions" FOR UPDATE USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Service role can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "Service role can manage exchange rates" ON "public"."exchange_rates" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role can manage rate limits" ON "public"."rate_limits" USING (true);



CREATE POLICY "Service role full access" ON "public"."transactions" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Users can create orgs" ON "public"."organizations" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can only access their org's projects" ON "public"."projects" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can only access their org's transactions" ON "public"."transactions" TO "authenticated" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view billing milestones" ON "public"."billing_milestones" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view change orders" ON "public"."change_orders" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view deficiencies" ON "public"."deficiencies" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view employees" ON "public"."employees" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view exchange rates" ON "public"."exchange_rates" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view org members" ON "public"."organization_members" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own rate limits" ON "public"."rate_limits" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view projects" ON "public"."projects" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view property assets" ON "public"."property_assets" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view safety logs" ON "public"."safety_logs" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view subcontractors" ON "public"."subcontractors" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view their org's data" ON "public"."projects" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org's projects" ON "public"."projects" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their org's transactions" ON "public"."transactions" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view their orgs" ON "public"."organizations" FOR SELECT USING ("public"."is_org_member"("id"));



CREATE POLICY "Users can view time entries" ON "public"."time_entries" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view transaction items" ON "public"."transaction_items" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view transactions" ON "public"."transactions" FOR SELECT USING ("public"."is_org_member"("organization_id"));



CREATE POLICY "Users can view vendor aliases" ON "public"."vendor_aliases" FOR SELECT USING ("public"."is_org_member"("organization_id"));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."billing_milestones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."change_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."deficiencies" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."i18n_translations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payrolls" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."property_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."safety_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subcontractors" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_aliases" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_base_amount"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_base_amount"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_base_amount"() TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_bc_labor_cost"("duration_minutes" numeric, "hourly_rate" numeric, "overtime_enabled" boolean, "is_diy_hero" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_time_entry_overlap"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_time_entry_overlap"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_time_entry_overlap"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_transaction_items_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_transaction_items_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_transaction_items_total"() TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_currency"("p_amount" numeric, "p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_currency"("p_amount" numeric, "p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_currency"("p_amount" numeric, "p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_org_has_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_org_has_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_org_has_owner"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_exchange_rate"("p_from_currency" "text", "p_to_currency" "text", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_admin"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_admin"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_admin"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_org_member"("org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_project_financials"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_project_financials"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_project_financials"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_in_organization"("org_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_in_organization"("org_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_in_organization"("org_uuid" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



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



GRANT ALL ON TABLE "public"."exchange_rates" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rates" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rates" TO "service_role";



GRANT ALL ON TABLE "public"."i18n_translations" TO "anon";
GRANT ALL ON TABLE "public"."i18n_translations" TO "authenticated";
GRANT ALL ON TABLE "public"."i18n_translations" TO "service_role";



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



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."project_financials" TO "anon";
GRANT ALL ON TABLE "public"."project_financials" TO "authenticated";
GRANT ALL ON TABLE "public"."project_financials" TO "service_role";



GRANT ALL ON TABLE "public"."property_assets" TO "anon";
GRANT ALL ON TABLE "public"."property_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."property_assets" TO "service_role";



GRANT ALL ON TABLE "public"."rate_limits" TO "anon";
GRANT ALL ON TABLE "public"."rate_limits" TO "authenticated";
GRANT ALL ON TABLE "public"."rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."safety_logs" TO "anon";
GRANT ALL ON TABLE "public"."safety_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."safety_logs" TO "service_role";



GRANT ALL ON TABLE "public"."subcontractors" TO "anon";
GRANT ALL ON TABLE "public"."subcontractors" TO "authenticated";
GRANT ALL ON TABLE "public"."subcontractors" TO "service_role";



GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";



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



