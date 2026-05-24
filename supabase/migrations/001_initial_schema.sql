-- ============================================================
-- E-Arsip Mamberamo Raya - Initial Schema
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for full-text search

-- ============================================================
-- INSTANSI (Organizations / OPD)
-- ============================================================
CREATE TABLE IF NOT EXISTS instansi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        TEXT UNIQUE NOT NULL,
  nama        TEXT NOT NULL,
  singkatan   TEXT,
  alamat      TEXT,
  telepon     TEXT,
  email       TEXT,
  website     TEXT,
  logo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- KARYAWAN (Employees / PNS)
-- ============================================================
CREATE TABLE IF NOT EXISTS karyawan (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nip         TEXT UNIQUE NOT NULL,
  nama        TEXT NOT NULL,
  jabatan     TEXT,
  golongan    TEXT,
  id_instansi UUID REFERENCES instansi(id) ON DELETE SET NULL,
  email       TEXT UNIQUE,
  foto_url    TEXT,
  tipe        TEXT NOT NULL DEFAULT 'struktural' CHECK (tipe IN ('struktural', 'pelaksana')),
  aktif       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_karyawan_instansi ON karyawan(id_instansi);
CREATE INDEX idx_karyawan_nip ON karyawan(nip);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nip         TEXT REFERENCES karyawan(nip) ON DELETE SET NULL,
  id_instansi UUID REFERENCES instansi(id) ON DELETE SET NULL,
  hak         TEXT NOT NULL DEFAULT 'staf'
                CHECK (hak IN ('superadmin', 'admin', 'agendaris', 'staf', 'pimpinan')),
  is_agendaris BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_profiles_instansi ON user_profiles(id_instansi);

-- ============================================================
-- KLASIFIKASI ARSIP
-- ============================================================
CREATE TABLE IF NOT EXISTS klasifikasi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode        TEXT NOT NULL,
  nama        TEXT NOT NULL,
  keterangan  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- JADWAL RETENSI ARSIP (JRA)
-- ============================================================
CREATE TABLE IF NOT EXISTS jra (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode            TEXT UNIQUE NOT NULL,
  id_klasifikasi  UUID REFERENCES klasifikasi(id) ON DELETE SET NULL,
  judul           TEXT NOT NULL,
  retensi_aktif   INTEGER,   -- dalam tahun
  retensi_inaktif INTEGER,   -- dalam tahun
  nasib_akhir     TEXT CHECK (nasib_akhir IN ('permanen', 'musnah', 'dinilai_kembali')),
  keterangan      TEXT,
  dasar_hukum     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jra_klasifikasi ON jra(id_klasifikasi);

-- ============================================================
-- ARSIP
-- ============================================================
CREATE TABLE IF NOT EXISTS arsip (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_arsip           TEXT UNIQUE NOT NULL,
  judul                 TEXT NOT NULL,
  perihal               TEXT,
  id_klasifikasi        UUID REFERENCES klasifikasi(id) ON DELETE SET NULL,
  id_jra                UUID REFERENCES jra(id) ON DELETE SET NULL,
  nomor_surat           TEXT,
  tanggal_surat         DATE,
  id_instansi           UUID REFERENCES instansi(id) ON DELETE SET NULL,
  pengirim              TEXT,
  tingkat_keamanan      TEXT NOT NULL DEFAULT 'biasa'
                          CHECK (tingkat_keamanan IN ('biasa', 'terbatas', 'rahasia', 'sangat_rahasia')),
  media_simpan          TEXT NOT NULL DEFAULT 'digital'
                          CHECK (media_simpan IN ('digital', 'fisik', 'keduanya')),
  tingkat_perkembangan  TEXT CHECK (tingkat_perkembangan IN ('asli', 'fotokopi', 'tembusan')),
  kurun_waktu_mulai     DATE,
  kurun_waktu_selesai   DATE,
  jumlah                INTEGER NOT NULL DEFAULT 1,
  keterangan            TEXT,
  status                TEXT NOT NULL DEFAULT 'aktif'
                          CHECK (status IN ('aktif', 'inaktif', 'vital', 'permanen', 'musnah', 'draft')),
  file_url              TEXT,
  thumbnail_url         TEXT,
  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_arsip_instansi   ON arsip(id_instansi);
CREATE INDEX idx_arsip_klasifikasi ON arsip(id_klasifikasi);
CREATE INDEX idx_arsip_status      ON arsip(status);
CREATE INDEX idx_arsip_created_at  ON arsip(created_at DESC);
CREATE INDEX idx_arsip_search      ON arsip USING gin(to_tsvector('indonesian', judul || ' ' || coalesce(perihal, '') || ' ' || coalesce(nomor_surat, '')));

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER arsip_updated_at
  BEFORE UPDATE ON arsip
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- SURAT MASUK
-- ============================================================
CREATE TABLE IF NOT EXISTS surat_masuk (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_agenda    TEXT UNIQUE NOT NULL,
  asal_surat      TEXT NOT NULL,
  nomor_surat     TEXT NOT NULL,
  tanggal_surat   DATE NOT NULL,
  tanggal_terima  DATE NOT NULL DEFAULT CURRENT_DATE,
  perihal         TEXT NOT NULL,
  id_instansi     UUID REFERENCES instansi(id) ON DELETE SET NULL,
  disposisi_kepada UUID REFERENCES karyawan(id) ON DELETE SET NULL,
  sifat           TEXT NOT NULL DEFAULT 'biasa'
                    CHECK (sifat IN ('biasa', 'penting', 'rahasia', 'sangat_segera')),
  file_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'baru'
                    CHECK (status IN ('baru', 'diproses', 'selesai', 'diarsipkan')),
  id_arsip        UUID REFERENCES arsip(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_surat_masuk_instansi ON surat_masuk(id_instansi);
CREATE INDEX idx_surat_masuk_created  ON surat_masuk(created_at DESC);

-- ============================================================
-- SURAT KELUAR
-- ============================================================
CREATE TABLE IF NOT EXISTS surat_keluar (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_agenda    TEXT UNIQUE NOT NULL,
  tujuan          TEXT NOT NULL,
  nomor_surat     TEXT NOT NULL,
  tanggal_surat   DATE NOT NULL,
  perihal         TEXT NOT NULL,
  id_instansi     UUID REFERENCES instansi(id) ON DELETE SET NULL,
  penandatangan   UUID REFERENCES karyawan(id) ON DELETE SET NULL,
  sifat           TEXT NOT NULL DEFAULT 'biasa'
                    CHECK (sifat IN ('biasa', 'penting', 'rahasia', 'sangat_segera')),
  file_url        TEXT,
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'menunggu_ttd', 'terkirim', 'diarsipkan')),
  id_arsip        UUID REFERENCES arsip(id) ON DELETE SET NULL,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_surat_keluar_instansi ON surat_keluar(id_instansi);
CREATE INDEX idx_surat_keluar_created  ON surat_keluar(created_at DESC);

-- ============================================================
-- NOTIFIKASI
-- ============================================================
CREATE TABLE IF NOT EXISTS notifikasi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  judul       TEXT NOT NULL,
  pesan       TEXT NOT NULL,
  tipe        TEXT NOT NULL DEFAULT 'info'
                CHECK (tipe IN ('info', 'warning', 'success', 'error')),
  dibaca      BOOLEAN NOT NULL DEFAULT false,
  link        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifikasi_user    ON notifikasi(user_id);
CREATE INDEX idx_notifikasi_dibaca  ON notifikasi(dibaca);
CREATE INDEX idx_notifikasi_created ON notifikasi(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE instansi         ENABLE ROW LEVEL SECURITY;
ALTER TABLE karyawan         ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE klasifikasi      ENABLE ROW LEVEL SECURITY;
ALTER TABLE jra              ENABLE ROW LEVEL SECURITY;
ALTER TABLE arsip            ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_masuk      ENABLE ROW LEVEL SECURITY;
ALTER TABLE surat_keluar     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi       ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's instansi
CREATE OR REPLACE FUNCTION get_user_instansi()
RETURNS UUID AS $$
  SELECT id_instansi FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_user_hak()
RETURNS TEXT AS $$
  SELECT hak FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- instansi: readable by all authenticated, writeable by superadmin
CREATE POLICY instansi_select ON instansi FOR SELECT TO authenticated USING (true);
CREATE POLICY instansi_modify ON instansi FOR ALL TO authenticated
  USING (get_user_hak() = 'superadmin');

-- karyawan: readable by same instansi, writeable by admin+
CREATE POLICY karyawan_select ON karyawan FOR SELECT TO authenticated
  USING (id_instansi = get_user_instansi() OR get_user_hak() = 'superadmin');
CREATE POLICY karyawan_modify ON karyawan FOR ALL TO authenticated
  USING (id_instansi = get_user_instansi() AND get_user_hak() IN ('superadmin', 'admin'));

-- user_profiles: own profile only (superadmin sees all)
CREATE POLICY profiles_select ON user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR get_user_hak() = 'superadmin');
CREATE POLICY profiles_update ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR get_user_hak() = 'superadmin');

-- klasifikasi & jra: readable by all, writeable by admin+
CREATE POLICY klas_select ON klasifikasi FOR SELECT TO authenticated USING (true);
CREATE POLICY klas_modify ON klasifikasi FOR ALL TO authenticated
  USING (get_user_hak() IN ('superadmin', 'admin'));
CREATE POLICY jra_select ON jra FOR SELECT TO authenticated USING (true);
CREATE POLICY jra_modify ON jra FOR ALL TO authenticated
  USING (get_user_hak() IN ('superadmin', 'admin'));

-- arsip: scoped to instansi
CREATE POLICY arsip_select ON arsip FOR SELECT TO authenticated
  USING (id_instansi = get_user_instansi() OR get_user_hak() = 'superadmin');
CREATE POLICY arsip_insert ON arsip FOR INSERT TO authenticated
  WITH CHECK (id_instansi = get_user_instansi() AND get_user_hak() IN ('superadmin', 'admin', 'agendaris', 'staf'));
CREATE POLICY arsip_update ON arsip FOR UPDATE TO authenticated
  USING (id_instansi = get_user_instansi() AND get_user_hak() IN ('superadmin', 'admin', 'agendaris'));
CREATE POLICY arsip_delete ON arsip FOR DELETE TO authenticated
  USING (id_instansi = get_user_instansi() AND get_user_hak() IN ('superadmin', 'admin'));

-- surat_masuk / surat_keluar: scoped to instansi
CREATE POLICY sm_select ON surat_masuk FOR SELECT TO authenticated
  USING (id_instansi = get_user_instansi() OR get_user_hak() = 'superadmin');
CREATE POLICY sm_insert ON surat_masuk FOR INSERT TO authenticated
  WITH CHECK (id_instansi = get_user_instansi());
CREATE POLICY sm_update ON surat_masuk FOR UPDATE TO authenticated
  USING (id_instansi = get_user_instansi());
CREATE POLICY sk_select ON surat_keluar FOR SELECT TO authenticated
  USING (id_instansi = get_user_instansi() OR get_user_hak() = 'superadmin');
CREATE POLICY sk_insert ON surat_keluar FOR INSERT TO authenticated
  WITH CHECK (id_instansi = get_user_instansi());
CREATE POLICY sk_update ON surat_keluar FOR UPDATE TO authenticated
  USING (id_instansi = get_user_instansi());

-- notifikasi: own only
CREATE POLICY notif_select ON notifikasi FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY notif_update ON notifikasi FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
