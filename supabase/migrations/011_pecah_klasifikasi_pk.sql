-- ============================================================
-- Migration 011: Pecah klasifikasi PK menjadi sub-klasifikasi
-- PK tetap ada sebagai induk, PK.01/PK.02/PK.03 ditambahkan
-- sehingga generate_nomor_surat menghasilkan prefix yang tepat:
--   PK.01/001/BPKPAD/V/2026  (PKS antar Instansi)
--   PK.02/001/BPKPAD/V/2026  (MoU)
--   PK.03/001/BPKPAD/V/2026  (PKS Pihak Ketiga)
-- ============================================================

-- 1. Tambah sub-klasifikasi PK.01, PK.02, PK.03
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES
(
  'a1111111-0000-0000-0000-000000000013',
  'PK.01',
  'Perjanjian Kerja Sama antar Instansi Pemerintah',
  'PKS antara instansi pemerintah pusat/daerah, termasuk BUMN/BUMD'
),
(
  'a1111111-0000-0000-0000-000000000014',
  'PK.02',
  'Memorandum of Understanding (MoU)',
  'Nota Kesepahaman/MoU yang bersifat umum sebelum PKS formal ditandatangani'
),
(
  'a1111111-0000-0000-0000-000000000015',
  'PK.03',
  'Perjanjian Kerja Sama dengan Pihak Ketiga/Swasta',
  'PKS antara instansi pemerintah dengan badan usaha swasta atau perorangan'
)
ON CONFLICT (kode) DO NOTHING;

-- 2. Hapus JRA lama yang menempel ke induk PK (akan dipindah ke sub-klasifikasi)
DELETE FROM jra WHERE kode IN ('PK/01', 'PK/02', 'PK/03');

-- 3. Tambah JRA baru masing-masing sub-klasifikasi
INSERT INTO jra (kode, id_klasifikasi, judul, retensi_aktif, retensi_inaktif, nasib_akhir, dasar_hukum) VALUES
(
  'PK.01/01',
  'a1111111-0000-0000-0000-000000000013',
  'Perjanjian Kerja Sama (PKS) antar Instansi Pemerintah',
  10, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
),
(
  'PK.02/01',
  'a1111111-0000-0000-0000-000000000014',
  'Memorandum of Understanding (MoU)',
  10, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
),
(
  'PK.03/01',
  'a1111111-0000-0000-0000-000000000015',
  'Perjanjian Kerja Sama dengan Pihak Ketiga/Swasta',
  10, 5, 'dinilai_kembali',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
)
ON CONFLICT (kode) DO NOTHING;
