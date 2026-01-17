-- [1] Relax GPS Constraints
ALTER TABLE "public"."timecards"
ALTER COLUMN "is_in_bounds_at_start" DROP NOT NULL,
ALTER COLUMN "is_in_bounds_at_end" DROP NOT NULL,
ALTER COLUMN "gps_metadata" DROP NOT NULL;

-- [2] Ensure Description Field exists (schema check)
ALTER TABLE "public"."timecards"
ADD COLUMN IF NOT EXISTS "description" TEXT;

-- [3] Ensure Project ID is required for cost allocation (if not already)
-- ALTER TABLE "public"."timecards" ALTER COLUMN "project_id" SET NOT NULL; 
-- Commenting out strict constraint for flexibility in case of 'General' tasks, 
-- but Frontend will enforce Project selection.
