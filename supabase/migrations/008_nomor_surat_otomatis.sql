-- ============================================================
-- 008_nomor_surat_otomatis.sql
-- Penomoran Surat Keluar Otomatis dengan Kodefikasi Arsip
-- Format: [Kode Klasifikasi]/[Nomor Urut]/[Kode SKPD]/[Bulan Romawi]/[Tahun]
-- Contoh: 005.1/001/DINKES/V/2026
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Tabel counter nomor urut surat ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nomor_urut_surat (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_instansi    UUID NOT NULL REFERENCES instansi(id) ON DELETE CASCADE,
  id_klasifikasi UUID NOT NULL REFERENCES klasifikasi(id) ON DELETE CASCADE,
  tahun          SMALLINT NOT NULL,
  counter        INTEGER NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id_instansi, id_klasifikasi, tahun)
);

CREATE INDEX idx_nomor_urut_instansi ON nomor_urut_surat(id_instansi, tahun);

ALTER TABLE nomor_urut_surat ENABLE ROW LEVEL SECURITY;

-- Counter hanya bisa dimodifikasi via fungsi SECURITY DEFINER (bukan langsung)
CREATE POLICY nur_select ON nomor_urut_surat FOR SELECT TO authenticated USING (
  id_instansi = get_user_instansi() OR get_user_hak() = 'superadmin'
);

-- ── 2. Tambah kolom id_klasifikasi ke surat_keluar ────────────────────────────
ALTER TABLE surat_keluar
  ADD COLUMN IF NOT EXISTS id_klasifikasi UUID REFERENCES klasifikasi(id) ON DELETE SET NULL;

-- ── 3. Tambah UNIQUE constraint pada klasifikasi.kode ────────────────────────
-- Tabel klasifikasi (001_initial_schema.sql) tidak memiliki UNIQUE pada kode;
-- constraint ini diperlukan agar INSERT ... ON CONFLICT (kode) bekerja.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'klasifikasi_kode_unique'
      AND conrelid = 'klasifikasi'::regclass
  ) THEN
    ALTER TABLE klasifikasi ADD CONSTRAINT klasifikasi_kode_unique UNIQUE (kode);
  END IF;
END $$;

-- ── 4. Seed Kode Klasifikasi Arsip ────────────────────────────────────────────
-- Berdasarkan Perka ANRI No. 19 Tahun 2012 &
-- Permendagri No. 78 Tahun 2012 tentang Tata Kearsipan Pemerintah Daerah
INSERT INTO klasifikasi (kode, nama, keterangan) VALUES
  -- ─── 000: UMUM ──────────────────────────────────────────────────────────────
  ('000',   'Umum',                                      'Urusan umum organisasi'),
  ('005',   'Surat Menyurat',                            'Kegiatan korespondensi dinas'),
  ('005.1', 'Surat Dinas',                               'Surat dinas biasa'),
  ('005.2', 'Surat Edaran',                              'Pemberitahuan/edaran umum'),
  ('005.3', 'Nota Dinas / Memo',                         'Komunikasi internal antar unit'),
  ('008',   'Ketatausahaan',                             'Administrasi dan tata usaha'),
  ('010',   'Kepustakaan / Dokumentasi',                 'Pengelolaan bahan bacaan'),
  ('030',   'Humas dan Protokol',                        'Hubungan masyarakat dan keprotokolan'),
  ('050',   'Perencanaan Program',                       'Perencanaan dan program kerja'),

  -- ─── 100: PEMERINTAHAN ────────────────────────────────────────────────────
  ('100',   'Pemerintahan',                              'Urusan pemerintahan umum'),
  ('110',   'Dewan Perwakilan Rakyat Daerah',            'Kegiatan DPRD'),
  ('130',   'Kecamatan dan Kelurahan/Kampung',           'Urusan pemerintahan kecamatan'),
  ('160',   'Hubungan Luar Negeri',                      'Kerjasama internasional'),
  ('170',   'Otonomi Daerah',                            'Desentralisasi dan otonomi'),
  ('190',   'Pemilihan Umum',                            'Penyelenggaraan pemilu'),

  -- ─── 200: POLITIK ─────────────────────────────────────────────────────────
  ('200',   'Politik',                                   'Urusan politik dalam negeri'),
  ('210',   'Organisasi Kemasyarakatan',                 'Ormas dan LSM'),

  -- ─── 300: KEAMANAN DAN KETERTIBAN ─────────────────────────────────────────
  ('300',   'Keamanan dan Ketertiban',                   'Ketentraman dan ketertiban umum'),
  ('320',   'Penanggulangan Bencana',                    'Penanganan kedaruratan dan bencana'),

  -- ─── 400: KESEJAHTERAAN RAKYAT ────────────────────────────────────────────
  ('400',   'Kesejahteraan Rakyat',                      'Urusan sosial kemasyarakatan'),
  ('410',   'Pendidikan',                                'Penyelenggaraan pendidikan'),
  ('420',   'Kepemudaan',                                'Pembinaan pemuda'),
  ('430',   'Olah Raga',                                 'Keolahragaan daerah'),
  ('440',   'Kesehatan',                                 'Pelayanan dan program kesehatan'),
  ('440.1', 'Kesehatan Ibu dan Anak',                    'Program KIA/KB'),
  ('440.2', 'Pemberantasan Penyakit Menular',            'Surveilans dan P2M'),
  ('440.3', 'Gizi Masyarakat',                           'Program perbaikan gizi'),
  ('450',   'Sosial',                                    'Kesejahteraan sosial'),
  ('460',   'Tenaga Kerja',                              'Ketenagakerjaan dan pelatihan'),
  ('470',   'Transmigrasi',                              'Program transmigrasi'),
  ('480',   'Kependudukan dan Catatan Sipil',            'Administrasi kependudukan'),

  -- ─── 500: PEREKONOMIAN ────────────────────────────────────────────────────
  ('500',   'Perekonomian',                              'Urusan perekonomian daerah'),
  ('510',   'Pertanian, Perkebunan, dan Peternakan',     'Agribisnis dan peternakan'),
  ('520',   'Kehutanan',                                 'Pengelolaan hutan daerah'),
  ('530',   'Pertambangan dan Energi',                   'Sumber daya mineral dan energi'),
  ('540',   'Perindustrian',                             'Pengembangan industri'),
  ('560',   'Perdagangan',                               'Perdagangan dalam/luar negeri'),
  ('570',   'Koperasi dan UMKM',                         'Pembinaan koperasi dan usaha kecil'),
  ('580',   'Perhubungan',                               'Transportasi darat, laut, dan udara'),
  ('590',   'Pariwisata',                                'Pengembangan pariwisata daerah'),

  -- ─── 600: PEKERJAAN UMUM ──────────────────────────────────────────────────
  ('600',   'Pekerjaan Umum',                            'Infrastruktur dan tata ruang'),
  ('610',   'Pengairan dan Irigasi',                     'Pengelolaan sumber daya air'),
  ('620',   'Jalan dan Jembatan',                        'Pembangunan dan pemeliharaan jalan'),
  ('640',   'Tata Ruang',                                'Perencanaan dan pemanfaatan tata ruang'),
  ('650',   'Perumahan dan Permukiman',                  'Perumahan rakyat dan kawasan'),

  -- ─── 700: PENGAWASAN ──────────────────────────────────────────────────────
  ('700',   'Pengawasan',                                'Pengawasan internal dan eksternal'),
  ('710',   'Pemeriksaan',                               'Audit dan pemeriksaan'),

  -- ─── 800: KEPEGAWAIAN ─────────────────────────────────────────────────────
  ('800',   'Kepegawaian',                               'Manajemen ASN umum'),
  ('801',   'Pengadaan dan Pengangkatan',                'Rekrutmen dan CPNS/PPPK'),
  ('801.1', 'Penempatan dan Mutasi',                     'Pemindahan tugas pegawai'),
  ('802',   'Kepangkatan',                               'Kenaikan pangkat dan golongan'),
  ('803',   'Penghargaan dan Tanda Jasa',                'Satya Lencana dan penghargaan'),
  ('804',   'Kesejahteraan Pegawai',                     'TPP, tunjangan, dan fasilitas'),
  ('805',   'Cuti',                                      'Izin cuti pegawai'),
  ('806',   'Disiplin Pegawai',                          'Pelanggaran dan hukuman disiplin'),
  ('807',   'Pemberhentian dan Pensiun',                 'Pensiun dan pemberhentian ASN'),
  ('810',   'Pendidikan dan Pelatihan',                  'Diklat struktural dan fungsional'),
  ('820',   'Penilaian Kinerja',                         'SKP dan evaluasi kinerja'),

  -- ─── 900: KEUANGAN ────────────────────────────────────────────────────────
  ('900',   'Keuangan',                                  'Pengelolaan keuangan daerah'),
  ('902',   'Perencanaan Anggaran',                      'Penyusunan APBD/APBD-P'),
  ('903',   'Pelaksanaan Anggaran',                      'DPA dan realisasi anggaran'),
  ('904',   'Perbendaharaan',                            'Kas daerah dan SP2D'),
  ('905',   'Verifikasi dan Akuntansi',                  'Rekonsiliasi dan laporan keuangan'),
  ('906',   'Gaji dan Tunjangan',                        'Penggajian ASN'),
  ('907',   'Perpajakan dan Retribusi',                  'Pajak daerah dan retribusi'),
  ('910',   'Aset dan Barang Milik Daerah',              'Pengelolaan BMD')

ON CONFLICT (kode) DO UPDATE
  SET nama       = EXCLUDED.nama,
      keterangan = EXCLUDED.keterangan;

-- ── 5. Fungsi generate_nomor_surat (SECURITY DEFINER) ─────────────────────────
-- Atomically increments counter and returns formatted nomor surat.
-- ONLY called when letter status changes to 'terkirim' or 'menunggu_ttd'.
CREATE OR REPLACE FUNCTION public.generate_nomor_surat(
  p_id_instansi    UUID,
  p_id_klasifikasi UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid           UUID := auth.uid();
  v_kode_klas     TEXT;
  v_kode_skpd     TEXT;
  v_tahun         SMALLINT := extract(year  FROM now())::SMALLINT;
  v_bulan_idx     INTEGER  := extract(month FROM now())::INTEGER;
  v_nomor_urut    INTEGER;
  v_bulan_romawi  TEXT[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  -- Pastikan user terautentikasi
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Tidak terautentikasi';
  END IF;

  -- Ambil kode klasifikasi
  SELECT kode INTO v_kode_klas
  FROM klasifikasi WHERE id = p_id_klasifikasi;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode klasifikasi tidak ditemukan: %', p_id_klasifikasi;
  END IF;

  -- Ambil singkatan instansi sebagai kode SKPD
  SELECT COALESCE(singkatan, kode, nama) INTO v_kode_skpd
  FROM instansi WHERE id = p_id_instansi;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Instansi tidak ditemukan: %', p_id_instansi;
  END IF;

  -- Increment counter secara atomik
  INSERT INTO nomor_urut_surat (id_instansi, id_klasifikasi, tahun, counter)
  VALUES (p_id_instansi, p_id_klasifikasi, v_tahun, 1)
  ON CONFLICT (id_instansi, id_klasifikasi, tahun)
  DO UPDATE SET
    counter    = nomor_urut_surat.counter + 1,
    updated_at = now()
  RETURNING counter INTO v_nomor_urut;

  -- Return: 005.1/003/DINKES/V/2026
  RETURN v_kode_klas
    || '/' || lpad(v_nomor_urut::TEXT, 3, '0')
    || '/' || v_kode_skpd
    || '/' || v_bulan_romawi[v_bulan_idx]
    || '/' || v_tahun::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_nomor_surat TO authenticated;

-- ── 6. Fungsi preview_nomor_surat (READ-ONLY, no increment) ───────────────────
-- Digunakan frontend untuk menampilkan preview format nomor surat
-- sebelum surat diterbitkan. Counter TIDAK diubah.
CREATE OR REPLACE FUNCTION public.preview_nomor_surat(
  p_id_instansi    UUID,
  p_id_klasifikasi UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kode_klas    TEXT;
  v_kode_skpd    TEXT;
  v_tahun        SMALLINT := extract(year  FROM now())::SMALLINT;
  v_bulan_idx    INTEGER  := extract(month FROM now())::INTEGER;
  v_next_counter INTEGER;
  v_bulan_romawi TEXT[] := ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
BEGIN
  SELECT kode INTO v_kode_klas
  FROM klasifikasi WHERE id = p_id_klasifikasi;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(singkatan, kode, nama) INTO v_kode_skpd
  FROM instansi WHERE id = p_id_instansi;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Peek next number without incrementing
  SELECT COALESCE(counter, 0) + 1 INTO v_next_counter
  FROM nomor_urut_surat
  WHERE id_instansi = p_id_instansi
    AND id_klasifikasi = p_id_klasifikasi
    AND tahun = v_tahun;

  -- Default to 1 if no counter yet
  v_next_counter := COALESCE(v_next_counter, 1);

  RETURN v_kode_klas
    || '/' || lpad(v_next_counter::TEXT, 3, '0')
    || '/' || v_kode_skpd
    || '/' || v_bulan_romawi[v_bulan_idx]
    || '/' || v_tahun::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_nomor_surat TO authenticated;

-- ── 7. Verifikasi ─────────────────────────────────────────────────────────────
SELECT
  routine_name,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('generate_nomor_surat', 'preview_nomor_surat');

SELECT COUNT(*) AS total_klasifikasi FROM klasifikasi;
