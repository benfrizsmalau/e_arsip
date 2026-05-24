-- ============================================================
-- 006_registration_policies.sql
-- Perbaikan RLS untuk alur registrasi pengguna baru
-- + Fungsi register_user (SECURITY DEFINER)
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Buat fungsi registrasi (SECURITY DEFINER) ──────────────────────────
--    Fungsi ini berjalan dengan hak superuser sehingga bisa bypass RLS
--    untuk INSERT karyawan & user_profiles saat registrasi pertama kali.

CREATE OR REPLACE FUNCTION public.register_user(
  p_nip        TEXT,
  p_nama       TEXT,
  p_jabatan    TEXT,
  p_id_instansi UUID,
  p_email      TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_existing_profile UUID;
BEGIN
  -- Pastikan user sudah login
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  -- Cek apakah profile sudah ada
  SELECT id INTO v_existing_profile
  FROM user_profiles WHERE id = v_uid;

  IF v_existing_profile IS NOT NULL THEN
    RAISE EXCEPTION 'Profil sudah terdaftar';
  END IF;

  -- Insert karyawan (abaikan jika NIP sudah ada)
  INSERT INTO karyawan (nip, nama, jabatan, id_instansi, email, tipe, aktif)
  VALUES (p_nip, p_nama, p_jabatan, p_id_instansi, p_email, 'pelaksana', true)
  ON CONFLICT (nip) DO NOTHING;

  -- Insert user_profiles dengan hak 'staf' (default)
  INSERT INTO user_profiles (id, nip, id_instansi, hak, is_agendaris)
  VALUES (v_uid, p_nip, p_id_instansi, 'staf', false)
  ON CONFLICT (id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'uid',     v_uid,
    'nip',     p_nip,
    'instansi', p_id_instansi
  );
END;
$$;

-- Izinkan authenticated user memanggil fungsi ini
GRANT EXECUTE ON FUNCTION public.register_user TO authenticated;

-- ── 2. Policy SELECT user_profiles — tambahkan akses admin OPD ───────────
-- Admin OPD perlu melihat semua user di instansinya (untuk Pengaturan)
DROP POLICY IF EXISTS profiles_select ON user_profiles;
CREATE POLICY profiles_select ON user_profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR get_user_hak() = 'superadmin'
    OR (get_user_hak() = 'admin' AND id_instansi = get_user_instansi())
  );

-- ── 3. Policy INSERT user_profiles — izinkan user insert profil sendiri ──
--    (fallback jika tidak menggunakan fungsi register_user)
DROP POLICY IF EXISTS profiles_insert ON user_profiles;
CREATE POLICY profiles_insert ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- ── 4. Policy UPDATE user_profiles — izinkan admin ubah role user OPD-nya
DROP POLICY IF EXISTS profiles_update ON user_profiles;
CREATE POLICY profiles_update ON user_profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR get_user_hak() = 'superadmin'
    OR (get_user_hak() = 'admin' AND id_instansi = get_user_instansi())
  );

-- ── 5. Policy karyawan — izinkan user INSERT karyawan sendiri saat daftar
--    (nip belum ada di sistem = registrasi baru)
DROP POLICY IF EXISTS karyawan_self_insert ON karyawan;
CREATE POLICY karyawan_self_insert ON karyawan FOR INSERT TO authenticated
  WITH CHECK (
    -- Hanya bisa insert jika NIP belum terdaftar (registrasi baru)
    NOT EXISTS (SELECT 1 FROM karyawan k WHERE k.nip = nip)
    -- Atau admin/superadmin yang menambah karyawan
    OR get_user_hak() IN ('admin', 'superadmin')
  );

-- ── 6. Verifikasi ─────────────────────────────────────────────────────────
SELECT
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'register_user';
