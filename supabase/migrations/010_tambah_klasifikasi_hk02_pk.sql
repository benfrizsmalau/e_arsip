-- ============================================================
-- Migration 010: Tambah Klasifikasi HK.02 dan PK
-- Dasar hukum: Permendagri No. 80/2015, Perka ANRI No. 5/2021
-- ============================================================

-- Klasifikasi baru
INSERT INTO klasifikasi (id, kode, nama, keterangan) VALUES
(
  'a1111111-0000-0000-0000-000000000011',
  'HK.02',
  'Keputusan Kepala OPD',
  'Surat Keputusan yang diterbitkan oleh Kepala Badan/Dinas/Kantor di tingkat OPD'
),
(
  'a1111111-0000-0000-0000-000000000012',
  'PK',
  'Perjanjian dan Kerja Sama',
  'Perjanjian Kerja Sama (PKS), Memorandum of Understanding (MoU), dan naskah perjanjian antar instansi'
)
ON CONFLICT (kode) DO NOTHING;

-- JRA untuk HK.02 — SK Kepala OPD
-- Retensi: 5 tahun aktif, 10 tahun inaktif, permanen
-- (setara dengan SK Bupati, produk hukum OPD bersifat penting)
INSERT INTO jra (kode, id_klasifikasi, judul, retensi_aktif, retensi_inaktif, nasib_akhir, dasar_hukum) VALUES
(
  'HK.02/01',
  'a1111111-0000-0000-0000-000000000011',
  'Surat Keputusan Kepala Badan',
  5, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 80/2015'
),
(
  'HK.02/02',
  'a1111111-0000-0000-0000-000000000011',
  'Surat Keputusan Kepala Dinas',
  5, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 80/2015'
),
(
  'HK.02/03',
  'a1111111-0000-0000-0000-000000000011',
  'Surat Keputusan Kepala Kantor/UPT',
  5,  5, 'dinilai_kembali',
  'Perka ANRI No. 5/2021; Permendagri No. 80/2015'
)
ON CONFLICT (kode) DO NOTHING;

-- JRA untuk PK — Perjanjian dan Kerja Sama
-- Retensi: 10 tahun aktif (selama perjanjian berlaku + masa kadaluarsa klaim),
-- 10 tahun inaktif, permanen (bukti hukum jangka panjang)
INSERT INTO jra (kode, id_klasifikasi, judul, retensi_aktif, retensi_inaktif, nasib_akhir, dasar_hukum) VALUES
(
  'PK/01',
  'a1111111-0000-0000-0000-000000000012',
  'Perjanjian Kerja Sama (PKS) antar Instansi Pemerintah',
  10, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
),
(
  'PK/02',
  'a1111111-0000-0000-0000-000000000012',
  'Memorandum of Understanding (MoU)',
  10, 10, 'permanen',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
),
(
  'PK/03',
  'a1111111-0000-0000-0000-000000000012',
  'Perjanjian Kerja Sama dengan Pihak Ketiga/Swasta',
  10,  5, 'dinilai_kembali',
  'Perka ANRI No. 5/2021; Permendagri No. 22/2020'
)
ON CONFLICT (kode) DO NOTHING;
