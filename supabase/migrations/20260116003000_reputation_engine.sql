-- [1] Create Reviews Table
CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "project_id" uuid REFERENCES public.projects(id),
    "from_user_id" uuid REFERENCES auth.users(id), -- User who wrote the review
    "to_user_id" uuid REFERENCES auth.users(id),   -- User who is being reviewed (e.g., contractor)
    "rating" integer CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "tags" TEXT[], -- e.g., ['Quality', 'Punctual', 'Clean']
    "is_public" BOOLEAN DEFAULT false, -- Defaults to false, requires moderation/approval
    "created_at" timestamptz DEFAULT now()
);

-- [2] Add Rating Aggregation to Profiles
-- Storing aggregates for O(1) read performance on profile cards
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS "average_rating" numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "total_reviews" integer DEFAULT 0;

-- [3] Enable RLS
ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;

-- Policy: Admin can see all reviews
CREATE POLICY "Admins can view all reviews" ON "public"."reviews"
FOR SELECT USING (
  EXISTS (
    SELECT 1 
    FROM public.organization_members om
    JOIN public.projects p ON p.organization_id = om.organization_id
    WHERE p.id = reviews.project_id
      AND om.user_id = auth.uid()
      AND om.role IN ('Owner', 'Admin')
  )
);

-- Policy: Users can view reviews they wrote or reviews about them
CREATE POLICY "Users can view own reviews" ON "public"."reviews"
FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

-- Policy: Public reviews can be seen by authenticated users (if we want internal social proof)
CREATE POLICY "Authenticated can view public reviews" ON "public"."reviews"
FOR SELECT USING (
  is_public = true AND auth.role() = 'authenticated'
);
