-- Data Factory Logic
-- Allow Estimate Items to be driven by dynamic variables (e.g. area, perimeter)

ALTER TABLE "public"."estimate_items" 
ADD COLUMN IF NOT EXISTS "logic_variable" "text", -- e.g. "{area}", "{perimeter}", "{wall_count}"
ADD COLUMN IF NOT EXISTS "logic_formula" "text"; -- e.g. "{area} * 1.1", "{perimeter} / 10"

-- Index for searching logic-driven items
CREATE INDEX IF NOT EXISTS "idx_estimate_items_logic" ON "public"."estimate_items" ("estimate_id") WHERE "logic_formula" IS NOT NULL;
