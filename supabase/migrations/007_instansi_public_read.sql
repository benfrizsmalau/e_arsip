-- ============================================================
-- 007_instansi_public_read.sql
-- Izinkan pengguna yang belum login (anon) membaca daftar
-- instansi — diperlukan pada halaman Pendaftaran Akun Baru.
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tambahkan policy SELECT untuk role 'anon' pada tabel instansi
-- (Data instansi bersifat publik — daftar SKPD Mamberamo Raya)
DROP POLICY IF EXISTS instansi_public_read ON instansi;
CREATE POLICY instansi_public_read ON instansi
  FOR SELECT TO anon
  USING (true);

-- Verifikasi semua policy aktif pada tabel instansi
SELECT
  policyname,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'instansi'
ORDER BY policyname;
