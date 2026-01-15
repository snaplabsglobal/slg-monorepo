-- [1] 为组织增加国家和地区代码，默认设为用户熟悉的 CA-BC
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS "country_code" TEXT DEFAULT 'CA',
ADD COLUMN IF NOT EXISTS "region_code" TEXT DEFAULT 'BC'; -- 对应省或州

-- [2] 扩展 i18n 系统，增加财务术语转换
-- 比如在加拿大叫 'Remittance'，在美国叫 'Tax Deposit'
INSERT INTO public.i18n_translations (key, lang, translation) VALUES
('term.remittance', 'en', 'Payroll Remittance'),
('term.remittance', 'en-US', 'Federal Tax Deposit'),
('term.remittance', 'zh', '工资税汇款'),
('term.tax_form', 'en', 'T4/T5/T2'),
('term.tax_form', 'en-US', 'W-2/1099/1120'),
('term.tax_form', 'zh', '税务表格'),
('label.sales_tax', 'en', 'GST/HST/PST'),
('label.sales_tax', 'en-US', 'Sales Tax')
ON CONFLICT (key, lang) DO NOTHING;
