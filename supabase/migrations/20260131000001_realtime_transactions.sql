-- Enable Realtime for transactions table (CEO + Cursor: one SQL, no UI clicking)
-- Idempotent: safe to run again if already enabled.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
  END IF;
END $$;

COMMIT;
