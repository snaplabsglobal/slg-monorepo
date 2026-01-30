-- ============================================================================
-- Create Receipt Images Storage Bucket
-- ============================================================================
-- Purpose: Create Supabase Storage bucket for receipt images
--          Used as fallback when Cloudflare R2 is not configured
-- ============================================================================

-- Create Storage bucket for receipt images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipt-images',
  'receipt-images',
  true,  -- Public bucket (allows public access)
  10485760,  -- 10MB file size limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']::text[];

-- Note: RLS policies for storage.objects are already defined in migration
-- 20260119164038_remote_schema.sql (lines 2651-2680)
-- Since RLS is currently disabled, these policies won't be enforced

-- Note: We cannot add COMMENT to storage.buckets table as it's a system table
-- and requires owner privileges. The bucket creation above is sufficient.
