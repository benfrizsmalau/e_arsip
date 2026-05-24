-- ============================================================
-- 005_instansi_37_skpd.sql
-- Ganti data instansi placeholder (002_seed.sql) dengan
-- 37 OPD resmi Kabupaten Mamberamo Raya Papua
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Hapus data karyawan yang terkait instansi placeholder ──────────────
DELETE FROM karyawan
WHERE id_instansi IN (
  SELECT id FROM instansi
  WHERE kode IN ('SETDA','BAPPEDA','DINKES','DISDIK','DPU','BKPSDM','BKAD','ARSIP')
);

-- ── 2. Hapus instansi placeholder dari 002_seed.sql ───────────────────────
DELETE FROM instansi
WHERE kode IN ('SETDA','BAPPEDA','DINKES','DISDIK','DPU','BKPSDM','BKAD','ARSIP');

-- ── 3. Insert 37 SKPD resmi Kabupaten Mamberamo Raya ─────────────────────
--    Format: (kode, nama, singkatan, alamat, email)
--    kode_pemda = kode resmi dari sistem pemerintahan (untuk referensi)

INSERT INTO instansi (kode, nama, singkatan, alamat, telepon, email) VALUES

-- ── Sekretariat & Badan Utama ─────────────────────────────────────────────
('SEKDA',        'Sekretariat Daerah Kabupaten Mamberamo Raya',                                    'SEKDA',       'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123001', 'sekda@mamberamoraya.go.id'),
('SETWAN',       'Sekretariat Dewan Perwakilan Rakyat Kabupaten',                                   'SETWAN',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123002', 'dprd@mamberamoraya.go.id'),
('INSPEKTORAT',  'Inspektorat Daerah Kabupaten Mamberamo Raya',                                    'INSPEKTORAT', 'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123003', 'inspektorat@mamberamoraya.go.id'),

-- ── Badan ─────────────────────────────────────────────────────────────────
('BAPPERIDA',    'Badan Perencanaan Pembangunan, Riset dan Inovasi Daerah',                        'BAPPERIDA',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123004', 'bapperida@mamberamoraya.go.id'),
('BPKPAD',       'Badan Pengelolaan Keuangan, Pendapatan dan Aset Daerah',                         'BPKPAD',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123005', 'bpkpad@mamberamoraya.go.id'),
('BKPSDM',       'Badan Kepegawaian dan Pengembangan Sumber Daya Manusia',                         'BKPSDM',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123006', 'bkpsdm@mamberamoraya.go.id'),
('BPBD',         'Badan Penanggulangan Bencana Daerah',                                            'BPBD',        'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123007', 'bpbd@mamberamoraya.go.id'),
('BAKESBANGPOL', 'Badan Kesatuan Bangsa dan Politik',                                              'BAKESBANGPOL','Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123008', 'bakesbangpol@mamberamoraya.go.id'),

-- ── Dinas ─────────────────────────────────────────────────────────────────
('DINKES',       'Dinas Kesehatan',                                                                 'DINKES',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123009', 'dinkes@mamberamoraya.go.id'),
('DINDIKBUD',    'Dinas Pendidikan dan Kebudayaan',                                                'DINDIKBUD',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123010', 'dindikbud@mamberamoraya.go.id'),
('DPUPR',        'Dinas Pekerjaan Umum dan Penataan Ruang',                                        'DPUPR',       'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123011', 'dpupr@mamberamoraya.go.id'),
('DISPERKIM',    'Dinas Perumahan Rakyat dan Kawasan Permukiman',                                  'DISPERKIM',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123012', 'disperkim@mamberamoraya.go.id'),
('SATPOLPP',     'Satuan Polisi Pamong Praja',                                                     'SATPOL PP',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123013', 'satpolpp@mamberamoraya.go.id'),
('DINSOS',       'Dinas Sosial',                                                                    'DINSOS',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123014', 'dinsos@mamberamoraya.go.id'),
('DISDUKCAPIL',  'Dinas Kependudukan dan Pencatatan Sipil',                                        'DISDUKCAPIL', 'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123015', 'disdukcapil@mamberamoraya.go.id'),
('DPMPK',        'Dinas Pemberdayaan Masyarakat dan Kampung',                                      'DPMPK',       'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123016', 'dpmpk@mamberamoraya.go.id'),
('DP3AKB',       'Dinas Pemberdayaan Perempuan, Perlindungan Anak dan Keluarga Berencana',         'DP3AKB',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123017', 'dp3akb@mamberamoraya.go.id'),
('DKP',          'Dinas Ketahanan Pangan',                                                         'DKP',         'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123018', 'dkp@mamberamoraya.go.id'),
('DLH',          'Dinas Lingkungan Hidup',                                                         'DLH',         'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123019', 'dlh@mamberamoraya.go.id'),
('DISHUB',       'Dinas Perhubungan',                                                              'DISHUB',      'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123020', 'dishub@mamberamoraya.go.id'),
('DISKOMINFO',   'Dinas Komunikasi dan Informatika',                                               'DISKOMINFO',  'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123021', 'diskominfo@mamberamoraya.go.id'),
('DPMPTSP',      'Dinas Penanaman Modal dan Pelayanan Terpadu Satu Pintu',                         'DPMPTSP',     'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123022', 'dpmptsp@mamberamoraya.go.id'),
('DISPORA',      'Dinas Kepemudaan, Olah Raga dan Pariwisata',                                     'DISPORA',     'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123023', 'dispora@mamberamoraya.go.id'),
('DISPARBUD',    'Dinas Pariwisata dan Kebudayaan',                                                'DISPARBUD',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123024', 'disparbud@mamberamoraya.go.id'),
('DISPERINDAGKOP','Dinas Perindustrian, Perdagangan, Koperasi, UMKM dan Tenaga Kerja',             'DISPERINDAGKOP','Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya','(0981) 123025','disperindagkop@mamberamoraya.go.id'),
('DISNAKKAN',    'Dinas Peternakan dan Perikanan',                                                 'DISNAKKAN',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123026', 'disnakkan@mamberamoraya.go.id'),
('DISTANBUN',    'Dinas Tanaman Pangan, Hortikultura dan Perkebunan',                              'DISTANBUN',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123027', 'distanbun@mamberamoraya.go.id'),
('DINARSIPUS',   'Dinas Arsip dan Perpustakaan',                                                   'DINARSIPUS',  'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123028', 'dinarsipus@mamberamoraya.go.id'),

-- ── Rumah Sakit ───────────────────────────────────────────────────────────
('RSKAWERA',     'Rumah Sakit Kawera',                                                             'RS KAWERA',   'Jl. Kamp. Burmeso, Burmeso, Mamberamo Raya', '(0981) 123029', 'rskawera@mamberamoraya.go.id'),

-- ── Distrik ───────────────────────────────────────────────────────────────
('DISTRIK-MT',   'Distrik Mamberamo Tengah',                                                       'DISTRIK MAMBERAMO TENGAH',       'Kamp. Mamberamo Tengah, Mamberamo Raya', '(0981) 124001', 'distmamtengah@mamberamoraya.go.id'),
('DISTRIK-MH',   'Distrik Mamberamo Hulu',                                                         'DISTRIK MAMBERAMO HULU',         'Kamp. Mamberamo Hulu, Mamberamo Raya',   '(0981) 124002', 'distmamhulu@mamberamoraya.go.id'),
('DISTRIK-RF',   'Distrik Roufaer',                                                                'DISTRIK ROUFAER',                'Kamp. Roufaer, Mamberamo Raya',           '(0981) 124003', 'distroufaer@mamberamoraya.go.id'),
('DISTRIK-MTT',  'Distrik Mamberamo Tengah Timur',                                                 'DISTRIK MAMBERAMO TENGAH TIMUR', 'Kamp. Mamberamo Tengah Timur, Mamberamo Raya','(0981) 124004','distmamtengtimur@mamberamoraya.go.id'),
('DISTRIK-MHR',  'Distrik Mamberamo Hilir',                                                        'DISTRIK MAMBERAMO HILIR',        'Kamp. Mamberamo Hilir, Mamberamo Raya',   '(0981) 124005', 'distmamhilir@mamberamoraya.go.id'),
('DISTRIK-WA',   'Distrik Waropen Atas',                                                           'DISTRIK WAROPEN ATAS',           'Kamp. Waropen Atas, Mamberamo Raya',      '(0981) 124006', 'distwaropenatas@mamberamoraya.go.id'),
('DISTRIK-BNK',  'Distrik Benuki',                                                                 'DISTRIK BENUKI',                 'Kamp. Benuki, Mamberamo Raya',            '(0981) 124007', 'distbenuki@mamberamoraya.go.id'),
('DISTRIK-SWI',  'Distrik Sawai',                                                                  'DISTRIK SAWAI',                  'Kamp. Sawai, Mamberamo Raya',             '(0981) 124008', 'distsawai@mamberamoraya.go.id')

ON CONFLICT (kode) DO UPDATE SET
  nama      = EXCLUDED.nama,
  singkatan = EXCLUDED.singkatan,
  alamat    = EXCLUDED.alamat,
  telepon   = EXCLUDED.telepon,
  email     = EXCLUDED.email;

-- ── 4. Re-insert karyawan pimpinan (linked ke instansi yang benar) ────────
INSERT INTO karyawan (nip, nama, jabatan, golongan, id_instansi, email, tipe)
SELECT
  '196501011985031001',
  'Drs. Yohanes Rumbino, M.Si',
  'Bupati Mamberamo Raya',
  'IV/d',
  i.id,
  'bupati@mamberamoraya.go.id',
  'struktural'
FROM instansi i WHERE i.kode = 'SEKDA'
ON CONFLICT (nip) DO NOTHING;

INSERT INTO karyawan (nip, nama, jabatan, golongan, id_instansi, email, tipe)
SELECT
  '196701011987022001',
  'Yosephina Siwi, S.Sos',
  'Wakil Bupati',
  'IV/c',
  i.id,
  'wabup@mamberamoraya.go.id',
  'struktural'
FROM instansi i WHERE i.kode = 'SEKDA'
ON CONFLICT (nip) DO NOTHING;

INSERT INTO karyawan (nip, nama, jabatan, golongan, id_instansi, email, tipe)
SELECT
  '197001011990031001',
  'Nikolaus Ane, S.AP, M.Si',
  'Sekretaris Daerah',
  'IV/b',
  i.id,
  'sekda@mamberamoraya.go.id',
  'struktural'
FROM instansi i WHERE i.kode = 'SEKDA'
ON CONFLICT (nip) DO NOTHING;

INSERT INTO karyawan (nip, nama, jabatan, golongan, id_instansi, email, tipe)
SELECT
  '197201011992032001',
  'Theresia Mandowen, S.IP',
  'Kepala Dinas Arsip dan Perpustakaan',
  'IV/a',
  i.id,
  'kadis.arsip@mamberamoraya.go.id',
  'struktural'
FROM instansi i WHERE i.kode = 'DINARSIPUS'
ON CONFLICT (nip) DO NOTHING;

-- ── 5. Verifikasi ─────────────────────────────────────────────────────────
SELECT
  ROW_NUMBER() OVER (ORDER BY
    CASE
      WHEN kode NOT LIKE 'DISTRIK%' THEN 0
      ELSE 1
    END, kode
  )  AS no,
  kode,
  singkatan,
  LEFT(nama, 55) AS nama
FROM instansi
ORDER BY
  CASE WHEN kode NOT LIKE 'DISTRIK%' THEN 0 ELSE 1 END,
  kode;
