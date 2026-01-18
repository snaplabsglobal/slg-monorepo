-- User Feedback Table
CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES "public"."profiles" ON DELETE SET NULL,
    "message" text,
    "transcription" text,
    "sentiment_score" integer, -- 1 to 10
    "is_urgent" boolean DEFAULT false,
    "context_url" text, -- The page they were on
    "audio_url" text,
    "ai_response" text,
    "status" text DEFAULT 'new' CHECK (status IN ('new', 'read', 'resolved')),
    "created_at" timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own feedback" ON "public"."user_feedback"
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own feedback" ON "public"."user_feedback"
    FOR SELECT USING (auth.uid() = user_id);

-- Admins can read (Assuming 'admin' logic elsewhere or use simple everyone logic for now, or just leave it private to user + AI)
-- For MVP, let's keep it private.
