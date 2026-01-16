-- [WP1] Database Constitution Refinements

-- 1. CSI Linking for Data Factory (Material Market Prices)
-- Ensures every scraped price is tagged with a CSI MasterFormat code
ALTER TABLE IF EXISTS "public"."material_market_prices"
ADD COLUMN IF NOT EXISTS "csi_code" TEXT REFERENCES "public"."csi_codes"("code");

-- 2. Three-Layer Isolation Architecture
-- Global Price Book (is_global = true) vs Org Price Book (is_global = false)
ALTER TABLE IF EXISTS "public"."unit_rates"
ADD COLUMN IF NOT EXISTS "is_global" BOOLEAN DEFAULT false;

ALTER TABLE IF EXISTS "public"."assemblies"
ADD COLUMN IF NOT EXISTS "is_global" BOOLEAN DEFAULT false;

-- Policy Update for Global Read Access (if needed)
-- Allow authenticated users to READ global items even if not in their org
CREATE POLICY "Read global unit rates" ON "public"."unit_rates"
FOR SELECT USING (is_global = true);

CREATE POLICY "Read global assemblies" ON "public"."assemblies"
FOR SELECT USING (is_global = true);


-- [WP2] AI Smart Manager (Snap-Jarvis)

-- Enable vector extension again just in case (Schema issues)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 1. Vector Search for Transactions (Visual Search)
-- Stores the embedding vector from Gemini 2.5 Flash (Dimension 768 standard)
-- Requires 'vector' extension (already enabled in 20260116011000)
ALTER TABLE IF EXISTS "public"."transaction_items"
ADD COLUMN IF NOT EXISTS "image_embedding" extensions.vector(768);

-- Create HNSW Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_transaction_items_embedding 
ON "public"."transaction_items" 
USING hnsw (image_embedding extensions.vector_cosine_ops);


-- [WP3] Sketcher Data Structure linking (Refinement)
-- Ensure project_drawings has needed fields (Created in prev migration, verifying)
-- Added in 20260116060000: drawing_data JSONB. Good.

-- Done.
