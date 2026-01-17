-- Add term_config for Industry-Specific Terminology
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "term_config" JSONB DEFAULT NULL;

-- Example Structure: { "PROJECT": "Job", "SITE": "Location", "TIMECARD": "Timesheet" }
