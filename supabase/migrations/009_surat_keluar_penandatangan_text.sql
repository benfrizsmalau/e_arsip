-- ============================================================
-- 009_surat_keluar_penandatangan_text.sql
-- Ubah kolom-kolom UUID FK yang seharusnya teks bebas:
--   surat_keluar.penandatangan  UUID → TEXT (nama pejabat TTD)
--   surat_masuk.disposisi_kepada UUID → TEXT (nama pejabat disposisi)
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── surat_keluar.penandatangan ────────────────────────────────────────────────
ALTER TABLE surat_keluar
  DROP CONSTRAINT IF EXISTS surat_keluar_penandatangan_fkey;

ALTER TABLE surat_keluar
  ALTER COLUMN penandatangan TYPE TEXT USING penandatangan::text;

-- ── surat_masuk.disposisi_kepada ──────────────────────────────────────────────
ALTER TABLE surat_masuk
  DROP CONSTRAINT IF EXISTS surat_masuk_disposisi_kepada_fkey;

ALTER TABLE surat_masuk
  ALTER COLUMN disposisi_kepada TYPE TEXT USING disposisi_kepada::text;

-- ── Verifikasi ────────────────────────────────────────────────────────────────
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('surat_keluar', 'surat_masuk')
  AND column_name IN ('penandatangan', 'disposisi_kepada')
ORDER BY table_name, column_name;
