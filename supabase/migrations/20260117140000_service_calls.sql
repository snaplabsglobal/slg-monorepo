-- Add is_service_call flag for Quick Service Jobs
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "is_service_call" BOOLEAN DEFAULT false;

-- Index for fast filtering Service Calls vs Projects
CREATE INDEX IF NOT EXISTS "idx_projects_service_call" ON "public"."projects" ("is_service_call");
