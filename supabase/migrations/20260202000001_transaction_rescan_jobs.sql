-- Queue for batch "cloud rescan" of transactions where tax=0 but total>0 (AI re-recognition).
-- Worker can poll/process this table to trigger rescan jobs.

CREATE TABLE IF NOT EXISTS public.transaction_rescan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_transaction_rescan_jobs_status
  ON public.transaction_rescan_jobs(status) WHERE status = 'queued';

COMMENT ON TABLE public.transaction_rescan_jobs IS 'Queue for re-running AI receipt recognition on transactions with tax=0 and total>0';
