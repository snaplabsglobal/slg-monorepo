ALTER TABLE public.payrolls 
ADD COLUMN IF NOT EXISTS "gross_pay_period" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "federal_tax" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "provincial_tax" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cpp_employee" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ei_employee" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "cpp_employer" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "ei_employer" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "vacation_pay_accrued" numeric(15,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS "pdoc_reference_number" TEXT,
ADD COLUMN IF NOT EXISTS "calculation_pdf_url" TEXT;

CREATE OR REPLACE VIEW public.payroll_remittance_summary AS
SELECT 
    org_id,
    SUM(cpp_employee + cpp_employer) as total_cpp_to_pay,
    SUM(ei_employee + ei_employer) as total_ei_to_pay,
    SUM(federal_tax + provincial_tax) as total_tax_to_pay
FROM public.payrolls GROUP BY org_id;
