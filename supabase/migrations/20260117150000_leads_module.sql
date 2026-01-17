-- Leads Table
CREATE TABLE IF NOT EXISTS "public"."leads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "client_name" "text" NOT NULL,
    "contact_info" "text",
    "appointment_time" timestamp with time zone,
    "address" "text",
    "notes" "text",
    "status" "text" DEFAULT 'new'::"text", -- new, visited, converted, lost
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- RLS
ALTER TABLE "public"."leads" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for org members" ON "public"."leads"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
    (EXISTS ( SELECT 1
   FROM organization_members
  WHERE ((organization_members.organization_id = leads.organization_id) AND (organization_members.user_id = auth.uid()))))
);

-- Index
CREATE INDEX IF NOT EXISTS "idx_leads_appt" ON "public"."leads" ("appointment_time");

-- Conversion RPC
CREATE OR REPLACE FUNCTION convert_lead_to_project(p_lead_id uuid, p_project_name text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    v_lead record;
    v_project_id uuid;
    v_org_id uuid;
BEGIN
    -- 1. Get Lead
    SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Lead not found';
    END IF;

    v_org_id := v_lead.organization_id;

    -- 2. Create Project
    INSERT INTO projects (
        organization_id, 
        name, 
        address, 
        client_name, -- Assuming we add this or put in context
        status, 
        status_code
    )
    VALUES (
        v_org_id,
        p_project_name,
        v_lead.address,
        v_lead.client_name,
        'Estimating',
        '00'
    )
    RETURNING id INTO v_project_id;

    -- 3. Update Lead
    UPDATE leads SET status = 'converted' WHERE id = p_lead_id;
    
    RETURN jsonb_build_object('project_id', v_project_id);
END;
$$;
