-- 1. Market Items (Public Reference Catalog)
CREATE TABLE IF NOT EXISTS "public"."market_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL, -- e.g. "Drywall 1/2in 4x8 Regular"
    "sku" "text", -- Store SKU e.g. "10001234"
    "price" numeric(10,2) DEFAULT 0,
    "unit" "text" DEFAULT 'each',
    "region" "text" DEFAULT 'BC',
    "source_url" "text",
    "last_scraped_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    PRIMARY KEY ("id")
);

-- 2. Link Estimate Items to Market Reference
ALTER TABLE "public"."estimate_items"
ADD COLUMN IF NOT EXISTS "market_reference_id" "uuid" REFERENCES "public"."market_items"("id") ON DELETE SET NULL;

-- 3. RLS
ALTER TABLE "public"."market_items" ENABLE ROW LEVEL SECURITY;

-- Everyone can read market items (Public Reference)
CREATE POLICY "Authenticated users can view market items" ON "public"."market_items"
FOR SELECT TO authenticated
USING (true);

-- Only service role can insert/update (Scraper)
-- (Implicitly denied for authenticated unless policy exists, which is good)

-- 4. Mock Data Seeding (for Immediate Testing)
INSERT INTO "public"."market_items" ("name", "sku", "price", "unit", "source_url")
VALUES 
('Drywall 1/2in 4x8 Regular', 'DW-48-REG', 15.98, 'sheet', 'https://homedepot.ca/demo'),
('2x4x8 SPF Dimension Lumber', 'LUM-248', 4.55, 'piece', 'https://homedepot.ca/demo'),
('Interior Paint Eggshell 18.9L', 'PT-5G-EGG', 245.00, 'pail', 'https://homedepot.ca/demo')
ON CONFLICT DO NOTHING;
