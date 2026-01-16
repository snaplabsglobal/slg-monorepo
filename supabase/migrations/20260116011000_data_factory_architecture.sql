-- [0] Enable Vector Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector SCHEMA extensions;

-- Set search path to include extensions for vector type
SET search_path = public, extensions;

-- [1] Material Market Prices Table (The Data Factory)
CREATE TABLE IF NOT EXISTS "public"."material_market_prices" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "material_name" TEXT,        -- Standardized Name: PEX Pipe 1/2"
    "raw_name" TEXT,             -- Raw Scan Name: PEX-A 1/2 INCH BLUE
    "brand" TEXT,                -- Brand: Uponor
    "category" TEXT,             -- Category: Plumbing
    "unit" TEXT,                 -- Unit: LF, EA, Bag
    "price" numeric(10,2),       -- Unit Price
    "vendor_id" TEXT,            -- Vendor: Home Depot, Lowes, Local Yard
    "region_code" TEXT,          -- Region: BC-Greater-Vancouver
    "captured_at" timestamptz DEFAULT now(),
    "embedding" vector(768)      -- For semantic similarity matching
);

-- Index for Vector Search (Optional but recommended for performance)
-- CREATE INDEX ON public.material_market_prices USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- [2] Real-time Budgeting View
CREATE OR REPLACE VIEW public.realtime_budget_index AS
SELECT 
    material_name,
    region_code,
    AVG(price) as avg_market_price,
    MIN(price) as best_local_price,
    COUNT(*) as data_points
FROM public.material_market_prices
WHERE captured_at > NOW() - INTERVAL '30 days'
GROUP BY material_name, region_code;

-- [3] Security (RLS)
ALTER TABLE "public"."material_market_prices" ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read market prices
CREATE POLICY "Authenticated users can view market prices" ON "public"."material_market_prices"
FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Service Role (superuser) bypasses RLS by default.
-- We do not strictly need a policy for Service Role to insert.
-- We will disable User inserts for now to ensure data integrity of the Factory.

-- CREATE POLICY "Admins can insert market prices" ON "public"."material_market_prices"
-- FOR INSERT WITH CHECK ( ... );
