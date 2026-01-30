-- Enable Supabase Realtime for transactions table
-- This allows real-time updates without polling

-- 1. Ensure REPLICA IDENTITY is set (required for Realtime)
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

-- 2. Add transactions table to Realtime publication
-- (Supabase automatically creates the publication, we just need to add the table)
-- Note: This is usually done via Supabase Dashboard, but we can also do it via SQL
-- The publication name is 'supabase_realtime' by default

-- Check if publication exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
  END IF;
END $$;

-- Add transactions table to publication (if not already added)
-- Note: If table is already in publication, this will error but can be ignored
DO $$
BEGIN
  -- Check if transactions table is already in the publication
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  END IF;
  
  -- Add other related tables if they exist and aren't already in publication
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'transaction_items')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'transaction_items'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_items;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organizations')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'organizations'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'organization_members')
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'organization_members'
    ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
  END IF;
END $$;

-- Note: Realtime is enabled by default in Supabase, but we ensure the table is in the publication
-- You can verify in Supabase Dashboard: Database → Replication → Tables
