-- [1] Enhance Projects for Showcase
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "showcase_description" TEXT;

-- [2] Enhance Transactions for Media Highlights
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS "is_highlight" BOOLEAN DEFAULT false; 

-- [3] Contractor Portfolios Table
CREATE TABLE IF NOT EXISTS "public"."contractor_portfolios" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "org_id" uuid REFERENCES auth.users(id), -- Keeping provided SQL, implies User as Proxy for Company or Freelancer
    "slug" TEXT UNIQUE, -- e.g., 'patrick-reno'
    "bio" TEXT,
    "specialties" TEXT[], -- e.g., ['Plumbing', 'Tile', 'Framing']
    "referral_code" TEXT UNIQUE,
    "theme_color" TEXT DEFAULT '#0070f3',
    "created_at" timestamptz DEFAULT now(),
    "updated_at" timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE "public"."contractor_portfolios" ENABLE ROW LEVEL SECURITY;

-- Policy: Public access to portfolios by Slug
CREATE POLICY "Public read access to portfolios" ON "public"."contractor_portfolios"
FOR SELECT USING (true);

-- Policy: Owner can update their portfolio
CREATE POLICY "Owners can update own portfolio" ON "public"."contractor_portfolios"
FOR UPDATE USING (auth.uid() = org_id);

-- Policy: Owners can insert their portfolio
CREATE POLICY "Owners can insert own portfolio" ON "public"."contractor_portfolios"
FOR INSERT WITH CHECK (auth.uid() = org_id);
