-- Add is_incomplete flag for Lightning Created projects
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "is_incomplete" BOOLEAN DEFAULT false;

-- Index for finding incomplete work
CREATE INDEX IF NOT EXISTS "idx_projects_incomplete" ON "public"."projects" ("is_incomplete");
