-- [1] Project Localization
ALTER TABLE "public"."projects"
ADD COLUMN IF NOT EXISTS "disclaimer_text" JSONB DEFAULT '{"en": "Standard Disclaimer", "zh": "标准免责声明"}'::jsonb;

-- [2] Organization Settings
ALTER TABLE "public"."organizations"
ADD COLUMN IF NOT EXISTS "default_locale" text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS "legal_disclaimer_template" JSONB DEFAULT '{"en": "Standard Disclaimer", "zh": "标准免责声明"}'::jsonb;

-- [3] Helper function to get disclaimer (optional, can be done in app)
-- SELECT disclaimer_text->>'en' FROM projects...
