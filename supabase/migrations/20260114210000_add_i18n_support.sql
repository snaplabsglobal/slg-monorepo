-- [1] 扩展 profiles 表，记录用户语言偏好
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS "language_code" TEXT DEFAULT 'en';

-- [2] 扩展 organizations 表，记录组织首选语言
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS "default_language" TEXT DEFAULT 'en';

-- [3] 创建统一的翻译字典表
CREATE TABLE IF NOT EXISTS "public"."i18n_translations" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "key" TEXT NOT NULL,
    "lang" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "created_at" timestamptz DEFAULT now(),
    UNIQUE("key", "lang")
);

-- [4] 开启 RLS
ALTER TABLE public.i18n_translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to translations" 
ON public.i18n_translations FOR SELECT USING (true);
