-- CTO#1: PWA Offline Mode - pending_analysis for async AI analysis after upload
-- Upload success -> create row; cron picks up and calls analyze; max 3 retries

create table if not exists public.pending_analysis (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid null,
  transaction_id uuid not null,
  status text not null default 'pending', -- pending | processing | done | failed
  retry_count int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pending_analysis_next_attempt_idx
  on public.pending_analysis (status, next_attempt_at);

create unique index if not exists pending_analysis_transaction_unique
  on public.pending_analysis (transaction_id);

-- RLS: authenticated users can insert (via API after upload); service role bypasses for cron
alter table public.pending_analysis enable row level security;

create policy "Authenticated can insert pending_analysis"
  on public.pending_analysis
  for insert
  with check (auth.role() = 'authenticated');
