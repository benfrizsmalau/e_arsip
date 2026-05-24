-- ============================================================
-- Seed Data: E-Arsip Mamberamo Raya
-- ============================================================

-- Instansi / OPD
INSERT INTO instansi (id, kode, nama, singkatan, alamat, telepon, email, website) VALUES
('11111111-1111-1111-1111-111111111111', 'SETDA',   'Sekretariat Daerah',          'Setda',   'Jl. Raya Burmeso No. 1, Burmeso', '(0981) 123456', 'setda@mamberamoraya.go.id',   'https://www.mamberamoraya.go.id'),
('22222222-2222-2222-2222-222222222222', 'BAPPEDA',  'Badan Perencanaan Daerah',    'BAPPEDA', 'Jl. Raya Burmeso No. 2, Burmeso', '(0981) 123457', 'bappeda@mamberamoraya.go.id', NULL),
('33333333-3333-3333-3333-333333333333', 'DINKES',   'Dinas Kesehatan',             'Dinkes',  'Jl. Raya Burmeso No. 3, Burmeso', '(0981) 123458', 'dinkes@mamberamoraya.go.id',  NULL),
('44444444-4444-4444-4444-444444444444', 'DISDIK',   'Dinas Pendidikan',            'Disdik',  'Jl. Raya Burmeso No. 4, Burmeso', '(0981) 123459', 'disdik@mamberamoraya.go.id',  NULL),
('55555555-5555-5555-5555-555555555555', 'DPU',      'Dinas Pekerjaan Umum',        'DPU',     'Jl. Raya Burmeso No. 5, Burmeso', '(0981) 123460', 'dpu@mamberamoraya.go.id',     NULL),
('66666666-6666-6666-6666-666666666666', 'BKPSDM',  'BKPSDM',                      'BKPSDM',  'Jl. Raya Burmeso No. 6, Burmeso', '(0981) 123461', 'bkpsdm@mamberamoraya.go.id',  NULL),
('77777777-7777-7777-7777-777777777777', 'BKAD',    'Badan Keuangan dan Aset',     'BKAD',    'Jl. Raya Burmeso No. 7, Burmeso', '(0981) 123462', 'bkad@mamberamoraya.go.id',    NULL),
('88888888-8888-8888-8888-888888888888', 'ARSIP',   'Dinas Kearsipan Daerah',      'Arsip',   'Jl. Raya Burmeso No. 8, Burmeso', '(0981) 123463', 'arsip@mamberamoraya.go.id',   NULL)
ON CONFLICT (kode) DO NOTHING;

-- Klasifikasi Arsip (standard kearsipan RI)
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES
('a1111111-0000-0000-0000-000000000001', 'PD',    'Pemerintah Daerah',              'Arsip yang berkaitan dengan penyelenggaraan pemerintahan daerah'),
('a1111111-0000-0000-0000-000000000002', 'KP',    'Kepegawaian',                    'Arsip bidang manajemen dan administrasi kepegawaian'),
('a1111111-0000-0000-0000-000000000003', 'KU',    'Keuangan',                       'Arsip bidang keuangan dan anggaran'),
('a1111111-0000-0000-0000-000000000004', 'PL',    'Perlengkapan',                   'Arsip bidang pengadaan dan pengelolaan aset/perlengkapan'),
('a1111111-0000-0000-0000-000000000005', 'HK',    'Hukum dan Perundang-undangan',   'Arsip bidang produk hukum dan perundang-undangan'),
('a1111111-0000-0000-0000-000000000006', 'HM',    'Hubungan Masyarakat',            'Arsip bidang komunikasi dan hubungan masyarakat'),
('a1111111-0000-0000-0000-000000000007', 'PP',    'Perencanaan dan Program',        'Arsip bidang perencanaan pembangunan'),
('a1111111-0000-0000-0000-000000000008', 'KS',    'Kesehatan',                      'Arsip bidang pelayanan kesehatan masyarakat'),
('a1111111-0000-0000-0000-000000000009', 'PD.02', 'Keputusan/Peraturan Kepala',     'Surat Keputusan dan Peraturan Kepala Daerah'),
('a1111111-0000-0000-0000-000000000010', 'UM',    'Umum',                           'Arsip yang tidak termasuk dalam klasifikasi lain')
ON CONFLICT DO NOTHING;

-- JRA (Jadwal Retensi Arsip)
INSERT INTO jra (kode, id_klasifikasi, judul, retensi_aktif, retensi_inaktif, nasib_akhir, dasar_hukum) VALUES
('PD/01',   'a1111111-0000-0000-0000-000000000001', 'Rencana Pembangunan Jangka Panjang Daerah (RPJPD)',    5, 10, 'permanen',        'Perka ANRI No. 7/2017'),
('PD/02',   'a1111111-0000-0000-0000-000000000001', 'Rencana Pembangunan Jangka Menengah Daerah (RPJMD)',   5, 10, 'permanen',        'Perka ANRI No. 7/2017'),
('KP/01',   'a1111111-0000-0000-0000-000000000002', 'Berkas Pegawai (CPNS/PNS)',                           5, 10, 'permanen',        'Perka ANRI No. 9/2018'),
('KP/02',   'a1111111-0000-0000-0000-000000000002', 'Daftar Hadir Pegawai',                                2,  3, 'musnah',          'Perka ANRI No. 9/2018'),
('KU/01',   'a1111111-0000-0000-0000-000000000003', 'Dokumen Anggaran (RKA, DPA)',                          5,  5, 'permanen',        'Perka ANRI No. 6/2017'),
('KU/02',   'a1111111-0000-0000-0000-000000000003', 'Laporan Keuangan Tahunan',                            5, 10, 'permanen',        'Perka ANRI No. 6/2017'),
('KU/03',   'a1111111-0000-0000-0000-000000000003', 'Bukti-bukti Pembayaran',                              2,  3, 'musnah',          'Perka ANRI No. 6/2017'),
('PL/01',   'a1111111-0000-0000-0000-000000000004', 'Dokumen Pengadaan Barang/Jasa',                        5,  5, 'dinilai_kembali', 'Perka ANRI No. 5/2017'),
('HK/01',   'a1111111-0000-0000-0000-000000000005', 'Peraturan Daerah',                                    5, 10, 'permanen',        'Perka ANRI No. 7/2017'),
('PD.02/01','a1111111-0000-0000-0000-000000000009', 'Surat Keputusan Bupati',                              5, 10, 'permanen',        'Perka ANRI No. 7/2017'),
('UM/01',   'a1111111-0000-0000-0000-000000000010', 'Surat Masuk Biasa',                                   2,  3, 'musnah',          'Perka ANRI No. 7/2017'),
('UM/02',   'a1111111-0000-0000-0000-000000000010', 'Surat Keluar Biasa',                                  2,  3, 'musnah',          'Perka ANRI No. 7/2017')
ON CONFLICT (kode) DO NOTHING;

-- Karyawan pimpinan (akan dihubungkan ke auth saat setup)
INSERT INTO karyawan (nip, nama, jabatan, golongan, id_instansi, email, tipe) VALUES
('196501011985031001', 'Drs. Yohanes Rumbino, M.Si',     'Bupati Mamberamo Raya',     'IV/d', '11111111-1111-1111-1111-111111111111', 'bupati@mamberamoraya.go.id',    'struktural'),
('196701011987022001', 'Yosephina Siwi, S.Sos',           'Wakil Bupati',              'IV/c', '11111111-1111-1111-1111-111111111111', 'wabup@mamberamoraya.go.id',     'struktural'),
('197001011990031001', 'Nikolaus Ane, S.AP, M.Si',        'Sekretaris Daerah',         'IV/b', '11111111-1111-1111-1111-111111111111', 'sekda@mamberamoraya.go.id',     'struktural'),
('197201011992032001', 'Theresia Mandowen, S.IP',         'Kepala Dinas Kearsipan',    'IV/a', '88888888-8888-8888-8888-888888888888', 'kadis.arsip@mamberamoraya.go.id','struktural'),
('198001012000031001', 'Admin Arsip Setda',               'Pengelola Arsip',           'III/b','11111111-1111-1111-1111-111111111111', 'admin.setda@mamberamoraya.go.id','pelaksana')
ON CONFLICT (nip) DO NOTHING;
