-- Migration: Add idempotency support to job_photos
-- Purpose: Prevent duplicate photo records on retry
-- Related: 260207_JSS照片存储Key规范与去重策略_CTO执行版.md

-- Add client_photo_id column (UUID from client)
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS client_photo_id uuid;

-- Add r2_key column (stable R2 object key)
ALTER TABLE public.job_photos
ADD COLUMN IF NOT EXISTS r2_key text;

-- Add unique constraint on client_photo_id
-- This ensures retry uploads don't create duplicate records
ALTER TABLE public.job_photos
ADD CONSTRAINT unique_client_photo_id UNIQUE (client_photo_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_job_photos_client_photo_id
ON public.job_photos(client_photo_id)
WHERE client_photo_id IS NOT NULL;

-- Add index for r2_key lookups
CREATE INDEX IF NOT EXISTS idx_job_photos_r2_key
ON public.job_photos(r2_key)
WHERE r2_key IS NOT NULL;

-- Comment explaining the columns
COMMENT ON COLUMN public.job_photos.client_photo_id IS
  'Client-generated UUID for idempotency. Same photo retry uses same ID.';

COMMENT ON COLUMN public.job_photos.r2_key IS
  'Stable R2 object key. Format: jobs/{jobId}/photos/{photoId}/preview.jpg';
