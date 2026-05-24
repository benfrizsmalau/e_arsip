-- ============================================================
-- 003_storage.sql
-- Buat bucket "arsip-files" dan policies untuk Supabase Storage
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Buat bucket arsip-files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'arsip-files',
  'arsip-files',
  true,
  10485760,   -- 10 MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. RLS pada storage.objects sudah dikelola oleh Supabase Storage.
--    Jangan ALTER TABLE storage.objects karena project user bukan owner tabel internal ini.

-- 3. Policy: pengguna terautentikasi bisa upload ke folder mereka sendiri
--    Path struktur: arsip/{user_id}/{filename}
DROP POLICY IF EXISTS "Authenticated users can upload arsip files" ON storage.objects;

CREATE POLICY "Authenticated users can upload arsip files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'arsip-files'
  AND (storage.foldername(name))[1] = 'arsip'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- 4. Policy: semua orang bisa baca file (public bucket)
DROP POLICY IF EXISTS "Public read for arsip files" ON storage.objects;

CREATE POLICY "Public read for arsip files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'arsip-files');

-- 5. Policy: pengguna hanya bisa update file milik mereka sendiri
DROP POLICY IF EXISTS "Users can update own arsip files" ON storage.objects;

CREATE POLICY "Users can update own arsip files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'arsip-files'
  AND auth.uid()::text = (storage.foldername(name))[2]
);

-- 6. Policy: pengguna hanya bisa hapus file milik mereka sendiri
DROP POLICY IF EXISTS "Users can delete own arsip files" ON storage.objects;

CREATE POLICY "Users can delete own arsip files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'arsip-files'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
