-- Migration: Storage RLS Policies for User Songs Bucket
-- Epic: Cloud Song Storage (P0)
-- Story: 1.2 Storage Bucket Setup
-- Date: 2026-01-04
--
-- This migration creates Row Level Security policies for the 'user-songs' storage bucket.
-- It ensures users can only access files within their own folder: {user_id}/...
--
-- IMPORTANT: The bucket must be created first using the setup-storage.ts script
-- or manually via the Supabase Dashboard before applying these policies.

-- ============================================
-- 1. STORAGE BUCKET POLICIES
-- ============================================
-- Policies are applied to the storage.objects table
-- The 'name' column contains the full file path including bucket name
-- We use storage.foldername(name) to extract path segments

-- ============================================
-- 2. SELECT (READ) POLICY
-- ============================================
-- Users can only read files in their own folder
-- Path validation: first folder must match user's auth.uid()

CREATE POLICY "Users can read own files"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'user-songs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 3. INSERT (UPLOAD) POLICY
-- ============================================
-- Users can only upload files to their own folder
-- Path validation: first folder must match user's auth.uid()

CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'user-songs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 4. UPDATE POLICY
-- ============================================
-- Users can only update (overwrite) files in their own folder
-- Path validation: first folder must match user's auth.uid()

CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'user-songs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'user-songs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 5. DELETE POLICY
-- ============================================
-- Users can only delete files in their own folder
-- Path validation: first folder must match user's auth.uid()

CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'user-songs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================
-- 6. DEMO/PUBLIC SONGS POLICY (Optional)
-- ============================================
-- If you need to support public demo songs that any authenticated user can read,
-- you can add an additional policy. Demo songs would be stored in a special folder
-- or the 'is_public' flag on user_songs table can be used.
--
-- Example: Allow reading files for public songs (requires join with user_songs table)
-- This is commented out as it requires the user_songs table to be set up first
-- and may have performance implications.

-- CREATE POLICY "Anyone can read public song files"
--     ON storage.objects FOR SELECT
--     USING (
--         bucket_id = 'user-songs'
--         AND EXISTS (
--             SELECT 1 FROM user_songs
--             WHERE user_songs.audio_storage_path = storage.objects.name
--             AND user_songs.is_public = TRUE
--         )
--     );

-- ============================================
-- 7. SERVICE ROLE ACCESS
-- ============================================
-- Note: The service role key bypasses RLS by default in Supabase.
-- Backend services using the service role key can access all files
-- without being restricted by these policies.
-- This is useful for:
--   - Admin operations
--   - Background processing (chord detection, stem separation)
--   - Migration scripts

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- To apply: Run this in Supabase SQL Editor or via CLI:
--   supabase db push
--
-- To verify policies:
--   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
--
-- To test:
-- 1. Authenticate as a user
-- 2. Try to upload to: user-songs/{user_id}/test.mp3 (should succeed)
-- 3. Try to upload to: user-songs/other-user-id/test.mp3 (should fail)
-- 4. Try to read files from other users' folders (should fail)
