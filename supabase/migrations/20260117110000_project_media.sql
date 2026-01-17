-- [1] Project Media (Progress Photos, Site Docs)
CREATE TABLE IF NOT EXISTS "public"."project_media" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES "public"."projects"("id") ON DELETE CASCADE NOT NULL,
    "url" text NOT NULL,
    "type" text DEFAULT 'PROGRESS', -- PROGRESS, DOC, OTHER
    "caption" text,
    "ai_tags" jsonb DEFAULT '[]'::jsonb,
    "created_at" timestamptz DEFAULT now(),
    "created_by" uuid REFERENCES "auth"."users"("id")
);

-- [2] Project Issues (Site Issues, Defects) - Could link to construction_alerts
CREATE TABLE IF NOT EXISTS "public"."project_issues" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES "public"."projects"("id") ON DELETE CASCADE NOT NULL,
    "image_url" text,
    "description" text,
    "severity" text DEFAULT 'NORMAL', -- LOW, NORMAL, CRITICAL
    "status" text DEFAULT 'OPEN', -- OPEN, RESOLVED
    "ai_analysis" jsonb,
    "created_at" timestamptz DEFAULT now(),
    "created_by" uuid REFERENCES "auth"."users"("id")
);

-- RLS Policies
ALTER TABLE "public"."project_media" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for organization members" ON "public"."project_media"
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = (SELECT organization_id FROM public.projects WHERE id = project_media.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = (SELECT organization_id FROM public.projects WHERE id = project_media.project_id)
        )
    );

ALTER TABLE "public"."project_issues" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write for organization members" ON "public"."project_issues"
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = (SELECT organization_id FROM public.projects WHERE id = project_issues.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.user_id = auth.uid()
            AND om.organization_id = (SELECT organization_id FROM public.projects WHERE id = project_issues.project_id)
        )
    );
