ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS "language_code" TEXT DEFAULT 'en';
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS "default_language" TEXT DEFAULT 'en';
CREATE TABLE IF NOT EXISTS "public"."i18n_translations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "key" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    UNIQUE("key", "lang")
);
ALTER TABLE public.i18n_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to translations" ON public.i18n_translations FOR SELECT USING (true);
