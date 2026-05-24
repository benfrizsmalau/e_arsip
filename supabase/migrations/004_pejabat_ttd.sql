-- ============================================================
-- 004_pejabat_ttd.sql
-- Tabel pejabat penandatangan per instansi (input manual admin)
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS pejabat_ttd (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_instansi  uuid NOT NULL REFERENCES instansi(id) ON DELETE CASCADE,
  nama         text NOT NULL,
  nip          text,
  jabatan      text NOT NULL,
  urutan       int  DEFAULT 0,
  aktif        boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Index untuk query per instansi
CREATE INDEX IF NOT EXISTS idx_pejabat_ttd_instansi ON pejabat_ttd(id_instansi, urutan);

-- Auto-update timestamp
CREATE TRIGGER update_pejabat_ttd_updated_at
  BEFORE UPDATE ON pejabat_ttd
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE pejabat_ttd ENABLE ROW LEVEL SECURITY;

-- Admin & superadmin instansi sendiri bisa baca
CREATE POLICY "Admin bisa baca pejabat instansinya"
ON pejabat_ttd FOR SELECT
TO authenticated
USING (
  id_instansi = get_user_instansi()
  OR get_user_hak() = 'superadmin'
);

-- Hanya admin instansi & superadmin yang bisa insert
CREATE POLICY "Admin bisa tambah pejabat"
ON pejabat_ttd FOR INSERT
TO authenticated
WITH CHECK (
  (id_instansi = get_user_instansi() AND get_user_hak() IN ('admin'))
  OR get_user_hak() = 'superadmin'
);

-- Hanya admin instansi & superadmin yang bisa update
CREATE POLICY "Admin bisa edit pejabat"
ON pejabat_ttd FOR UPDATE
TO authenticated
USING (
  (id_instansi = get_user_instansi() AND get_user_hak() IN ('admin'))
  OR get_user_hak() = 'superadmin'
);

-- Hanya admin instansi & superadmin yang bisa hapus
CREATE POLICY "Admin bisa hapus pejabat"
ON pejabat_ttd FOR DELETE
TO authenticated
USING (
  (id_instansi = get_user_instansi() AND get_user_hak() IN ('admin'))
  OR get_user_hak() = 'superadmin'
);
