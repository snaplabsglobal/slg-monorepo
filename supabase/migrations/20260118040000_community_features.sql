-- 1. Feature Requests Table
CREATE TABLE IF NOT EXISTS "public"."feature_requests" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "title" text NOT NULL,
    "description" text,
    "vote_count" integer DEFAULT 0,
    "status" text DEFAULT 'proposed' CHECK (status IN ('proposed', 'planned', 'in_progress', 'completed')),
    "created_at" timestamptz DEFAULT now()
);

-- Seed some initial features
INSERT INTO "public"."feature_requests" (title, description, vote_count) VALUES
('Dark Mode', 'Full dark theme support for night work', 12),
('Offline Mode', 'Full offline support for basements', 45),
('Export to QuickBooks', 'Direct integration with QBO', 89),
('Team Chat', 'Internal messaging system', 5);

-- 2. Votes Table (Many-to-Many User <-> Feature)
CREATE TABLE IF NOT EXISTS "public"."feature_votes" (
    "feature_id" uuid REFERENCES "public"."feature_requests" ON DELETE CASCADE,
    "user_id" uuid REFERENCES "public"."profiles" ON DELETE CASCADE,
    "created_at" timestamptz DEFAULT now(),
    PRIMARY KEY ("feature_id", "user_id")
);

-- 3. Update User Feedback for Tags
ALTER TABLE "public"."user_feedback"
ADD COLUMN IF NOT EXISTS "tags" text[];

-- 4. RLS
ALTER TABLE "public"."feature_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."feature_votes" ENABLE ROW LEVEL SECURITY;

-- Everyone can read features
CREATE POLICY "Public read features" ON "public"."feature_requests" FOR SELECT USING (true);

-- Users can vote
CREATE POLICY "Users vote" ON "public"."feature_votes" FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Users can remove vote
CREATE POLICY "Users unvote" ON "public"."feature_votes" FOR DELETE USING (auth.uid() = user_id);
-- Users can see their own votes (or public?) - Let's allow public read of votes for counts, or strict
CREATE POLICY "Public read votes" ON "public"."feature_votes" FOR SELECT USING (true);

-- 5. Trigger to update vote_count
CREATE OR REPLACE FUNCTION update_feature_vote_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.feature_requests SET vote_count = vote_count + 1 WHERE id = NEW.feature_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.feature_requests SET vote_count = vote_count - 1 WHERE id = OLD.feature_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_vote_count
AFTER INSERT OR DELETE ON public.feature_votes
FOR EACH ROW EXECUTE FUNCTION update_feature_vote_count();
