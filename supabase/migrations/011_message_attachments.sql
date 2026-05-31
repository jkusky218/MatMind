-- ── Migration 011: message attachments + storage bucket ──────────────────────
-- Run in Supabase SQL Editor

-- 1. Add attachments column to messages
--    Each row is a JSONB array: [{ url, name, type, size }]
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- 2. Create the storage bucket for channel file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'channel-files',
  'channel-files',
  true,           -- public so images load without signed-URL overhead
  10485760,       -- 10 MB per file
  ARRAY[
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'image/webp', 'image/heic', 'image/heif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies for storage.objects

-- Anyone can view files in the public bucket
CREATE POLICY "Public can view channel files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'channel-files');

-- Authenticated users can upload
CREATE POLICY "Authenticated users can upload channel files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'channel-files');

-- Users can delete their own uploads
CREATE POLICY "Users can delete own channel files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'channel-files' AND owner = auth.uid());
