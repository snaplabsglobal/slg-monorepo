-- Add is_service_bucket flag for generic Service/Small Jobs
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "is_service_bucket" BOOLEAN DEFAULT false;

-- Index
CREATE INDEX IF NOT EXISTS "idx_projects_service_bucket" ON "public"."projects" ("is_service_bucket");
