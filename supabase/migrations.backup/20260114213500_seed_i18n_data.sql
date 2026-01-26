-- [1] 确保 profiles 表有语言偏好字段
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS "language_code" TEXT DEFAULT 'en';

-- [2] 插入一些基础翻译数据作为验收测试
INSERT INTO public.i18n_translations (key, lang, translation) VALUES
('category.fuel', 'en', 'Fuel'),
('category.fuel', 'zh', '燃油费'),
('status.pending', 'en', 'Pending'),
('status.pending', 'zh', '待处理')
ON CONFLICT (key, lang) DO NOTHING;
