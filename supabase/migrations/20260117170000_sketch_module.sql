-- Project Drawings Table (Vector Data)
CREATE TABLE IF NOT EXISTS "public"."project_drawings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "project_id" "uuid" NOT NULL REFERENCES "public"."projects"("id") ON DELETE CASCADE,
    "name" "text" NOT NULL DEFAULT 'Sketch',
    "data" "jsonb" DEFAULT '{}'::jsonb, -- Stores paths, lines, points
    "preview_url" "text", -- Optional PNG snapshot
    "sqft" numeric(10,2) DEFAULT 0, -- Auto-calculated area
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- RLS
ALTER TABLE "public"."project_drawings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view drawings" ON "public"."project_drawings"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        JOIN organization_members ON projects.organization_id = organization_members.organization_id
        WHERE projects.id = project_drawings.project_id
        AND organization_members.user_id = auth.uid()
    )
);

CREATE POLICY "Org members can edit drawings" ON "public"."project_drawings"
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        JOIN organization_members ON projects.organization_id = organization_members.organization_id
        WHERE projects.id = project_drawings.project_id
        AND organization_members.user_id = auth.uid()
    )
);
