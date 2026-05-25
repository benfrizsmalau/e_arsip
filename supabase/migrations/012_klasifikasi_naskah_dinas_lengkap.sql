-- ============================================================
-- Migration 012: Klasifikasi Naskah Dinas Lengkap
-- Dasar hukum:
--   - Perka ANRI No. 19 Tahun 2012 (Klasifikasi Arsip Nasional)
--   - Permendagri No. 80 Tahun 2015 (Produk Hukum Daerah)
--   - Permendagri No. 54 Tahun 2009 (Tata Naskah Dinas)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- A. PRODUK HUKUM KEPALA DAERAH (pecah PD.02)
--    PD.02 tetap ada sebagai induk
-- ─────────────────────────────────────────────────────────────
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES

-- SK / Keputusan Bupati
('a2000000-0000-0000-0000-000000000001', 'PD.02.1',
 'Keputusan Bupati (SK Bupati)',
 'Surat Keputusan Bupati yang bersifat penetapan, berlaku internal maupun eksternal'),

-- Peraturan Bupati
('a2000000-0000-0000-0000-000000000002', 'PD.02.2',
 'Peraturan Bupati (Perbup)',
 'Peraturan yang ditetapkan Bupati sebagai produk hukum daerah bersifat pengaturan'),

-- Instruksi Bupati
('a2000000-0000-0000-0000-000000000003', 'PD.02.3',
 'Instruksi Bupati',
 'Perintah tertulis Bupati kepada bawahan untuk melaksanakan tugas tertentu'),

-- Surat Edaran Bupati
('a2000000-0000-0000-0000-000000000004', 'PD.02.4',
 'Surat Edaran Bupati',
 'Pemberitahuan tertulis Bupati kepada pejabat/masyarakat mengenai suatu hal')

ON CONFLICT (kode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- B. KEPUTUSAN KEPALA OPD (pecah HK.02)
--    HK.02 tetap ada sebagai induk
-- ─────────────────────────────────────────────────────────────
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES

('a2000000-0000-0000-0000-000000000005', 'HK.02.1',
 'Keputusan Sekretaris Daerah',
 'SK yang ditetapkan oleh Sekretaris Daerah Kabupaten Mamberamo Raya'),

('a2000000-0000-0000-0000-000000000006', 'HK.02.2',
 'Keputusan Kepala Badan',
 'SK yang ditetapkan oleh Kepala Badan (Bappeda, BKPSDM, dll)'),

('a2000000-0000-0000-0000-000000000007', 'HK.02.3',
 'Keputusan Kepala Dinas',
 'SK yang ditetapkan oleh Kepala Dinas (Dinkes, Disdik, DPU, dll)'),

('a2000000-0000-0000-0000-000000000008', 'HK.02.4',
 'Keputusan Kepala Kantor / UPTD',
 'SK yang ditetapkan oleh Kepala Kantor atau Unit Pelaksana Teknis Daerah')

ON CONFLICT (kode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- C. SURAT DINAS KHUSUS (sub dari 005)
-- ─────────────────────────────────────────────────────────────
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES

('a2000000-0000-0000-0000-000000000009', '005.4',
 'Surat Tugas',
 'Naskah dinas yang berisi penugasan pejabat/pegawai untuk melaksanakan tugas tertentu'),

('a2000000-0000-0000-0000-000000000010', '005.5',
 'Surat Keterangan',
 'Naskah dinas yang menerangkan kebenaran suatu hal atau status seseorang/barang'),

('a2000000-0000-0000-0000-000000000011', '005.6',
 'Surat Undangan Resmi',
 'Undangan dinas untuk rapat, acara, atau kegiatan resmi pemerintah'),

('a2000000-0000-0000-0000-000000000012', '005.7',
 'Surat Pengantar',
 'Naskah dinas pengantar pengiriman dokumen, barang, atau orang'),

('a2000000-0000-0000-0000-000000000013', '005.8',
 'Surat Perintah Perjalanan Dinas (SPPD)',
 'Perintah tertulis untuk melaksanakan perjalanan dinas')

ON CONFLICT (kode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- D. NASKAH DINAS INTERNAL & PELAPORAN
-- ─────────────────────────────────────────────────────────────
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES

('a2000000-0000-0000-0000-000000000014', '005.3.1',
 'Nota Dinas',
 'Komunikasi internal antar pejabat dalam satu instansi'),

('a2000000-0000-0000-0000-000000000015', '005.3.2',
 'Memo / Telaahan Staf',
 'Analisis atau pertimbangan staf kepada atasan sebagai bahan pengambilan keputusan'),

('a2000000-0000-0000-0000-000000000016', '050.1',
 'Laporan Kegiatan / Pelaksanaan Program',
 'Laporan tertulis atas pelaksanaan kegiatan atau program kerja'),

('a2000000-0000-0000-0000-000000000017', '050.2',
 'Berita Acara',
 'Naskah dinas yang memuat uraian proses dan hasil suatu kejadian/kegiatan resmi'),

('a2000000-0000-0000-0000-000000000018', '050.3',
 'Notulen / Risalah Rapat',
 'Catatan resmi jalannya rapat dan keputusan yang dihasilkan')

ON CONFLICT (kode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- E. NASKAH DINAS KEPEGAWAIAN KHUSUS (sub dari 800)
-- ─────────────────────────────────────────────────────────────
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES

('a2000000-0000-0000-0000-000000000019', '800.1',
 'Surat Kuasa',
 'Pemberian wewenang dari pejabat kepada pihak lain untuk bertindak atas namanya'),

('a2000000-0000-0000-0000-000000000020', '800.2',
 'Surat Pernyataan',
 'Pernyataan tertulis pejabat/pegawai atas suatu hal yang bersifat mengikat'),

('a2000000-0000-0000-0000-000000000021', '800.3',
 'Surat Rekomendasi',
 'Surat yang berisi dukungan atau rekomendasi dari pejabat berwenang')

ON CONFLICT (kode) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- F. JRA untuk klasifikasi baru
-- ─────────────────────────────────────────────────────────────

-- Hapus JRA lama HK.02 (dipindah ke sub-klasifikasi)
DELETE FROM jra WHERE kode IN ('HK.02/01', 'HK.02/02', 'HK.02/03');

INSERT INTO jra (kode, id_klasifikasi, judul, retensi_aktif, retensi_inaktif, nasib_akhir, dasar_hukum) VALUES

-- PD.02.1 — SK Bupati
('PD.02.1/01', 'a2000000-0000-0000-0000-000000000001',
 'Keputusan Bupati (SK Bupati)', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

-- PD.02.2 — Peraturan Bupati
('PD.02.2/01', 'a2000000-0000-0000-0000-000000000002',
 'Peraturan Bupati (Perbup)', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

-- PD.02.3 — Instruksi Bupati
('PD.02.3/01', 'a2000000-0000-0000-0000-000000000003',
 'Instruksi Bupati', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

-- PD.02.4 — Surat Edaran Bupati
('PD.02.4/01', 'a2000000-0000-0000-0000-000000000004',
 'Surat Edaran Bupati', 2, 5, 'dinilai_kembali',
 'Perka ANRI No. 5/2021'),

-- HK.02.x — SK Kepala OPD
('HK.02.1/01', 'a2000000-0000-0000-0000-000000000005',
 'Keputusan Sekretaris Daerah', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

('HK.02.2/01', 'a2000000-0000-0000-0000-000000000006',
 'Keputusan Kepala Badan', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

('HK.02.3/01', 'a2000000-0000-0000-0000-000000000007',
 'Keputusan Kepala Dinas', 5, 10, 'permanen',
 'Perka ANRI No. 5/2021; Permendagri No. 80/2015'),

('HK.02.4/01', 'a2000000-0000-0000-0000-000000000008',
 'Keputusan Kepala Kantor/UPTD', 5, 5, 'dinilai_kembali',
 'Perka ANRI No. 5/2021'),

-- 005.x — Surat Dinas Khusus
('005.4/01', 'a2000000-0000-0000-0000-000000000009',
 'Surat Tugas', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021'),

('005.5/01', 'a2000000-0000-0000-0000-000000000010',
 'Surat Keterangan', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021'),

('005.6/01', 'a2000000-0000-0000-0000-000000000011',
 'Surat Undangan Resmi', 1, 2, 'musnah',
 'Perka ANRI No. 5/2021'),

('005.7/01', 'a2000000-0000-0000-0000-000000000012',
 'Surat Pengantar', 1, 2, 'musnah',
 'Perka ANRI No. 5/2021'),

('005.8/01', 'a2000000-0000-0000-0000-000000000013',
 'SPPD (Surat Perintah Perjalanan Dinas)', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021'),

-- 005.3.x — Naskah Internal
('005.3.1/01', 'a2000000-0000-0000-0000-000000000014',
 'Nota Dinas', 1, 2, 'musnah',
 'Perka ANRI No. 5/2021'),

('005.3.2/01', 'a2000000-0000-0000-0000-000000000015',
 'Memo / Telaahan Staf', 1, 2, 'musnah',
 'Perka ANRI No. 5/2021'),

-- 050.x — Laporan & Berita Acara
('050.1/01', 'a2000000-0000-0000-0000-000000000016',
 'Laporan Kegiatan', 2, 5, 'dinilai_kembali',
 'Perka ANRI No. 5/2021'),

('050.2/01', 'a2000000-0000-0000-0000-000000000017',
 'Berita Acara', 2, 5, 'dinilai_kembali',
 'Perka ANRI No. 5/2021'),

('050.3/01', 'a2000000-0000-0000-0000-000000000018',
 'Notulen / Risalah Rapat', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021'),

-- 800.x — Surat Kepegawaian Khusus
('800.1/01', 'a2000000-0000-0000-0000-000000000019',
 'Surat Kuasa', 2, 5, 'dinilai_kembali',
 'Perka ANRI No. 5/2021'),

('800.2/01', 'a2000000-0000-0000-0000-000000000020',
 'Surat Pernyataan Pegawai', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021'),

('800.3/01', 'a2000000-0000-0000-0000-000000000021',
 'Surat Rekomendasi', 2, 3, 'musnah',
 'Perka ANRI No. 5/2021')

ON CONFLICT (kode) DO NOTHING;
