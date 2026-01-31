-- LedgerSnap AI 识别自动化与交互逻辑 (v1.0): receipt confirm flow
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.transactions.is_verified IS 'User confirmed receipt data (AI recognition flow)';
