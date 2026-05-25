import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const migrationPath = new URL('../supabase/migrations/013_reset_klasifikasi_permendagri83_pemda.sql', import.meta.url)
const sql = readFileSync(migrationPath, 'utf8')

assert.match(sql, /Permendagri\s+Nomor\s+83\s+Tahun\s+2022/i)
assert.match(sql, /KODE KLASIFIKASI ARSIP DI LINGKUNGAN PEMERINTAH DAERAH/i)
assert.match(sql, /DELETE\s+FROM\s+jra\s*;/i)
assert.match(sql, /DELETE\s+FROM\s+klasifikasi\s*;/i)

const insertedCodes = [...sql.matchAll(/\(\s*'([^']+)'\s*,\s*'((?:[^']|'{2})+)'\s*,\s*'((?:[^']|'{2})*)'\s*\)/g)].map((match) => ({
  code: match[1],
  name: match[2].replaceAll("''", "'"),
}))

assert.ok(insertedCodes.length >= 150, `expected at least 150 official codes, found ${insertedCodes.length}`)

const insertedCodeSet = new Set(insertedCodes.map((item) => item.code))

const requiredCodes = new Map([
  ['000', 'Umum'],
  ['000.1', 'Ketatausahaan dan Kerumahtanggaan'],
  ['000.5', 'Kearsipan'],
  ['000.7', 'Perencanaan Pembangunan'],
  ['100', 'Pemerintahan'],
  ['100.3', 'Hukum'],
  ['100.3.3.2', 'Keputusan / Ketetapan Bupati'],
  ['100.3.4.2', 'Instruksi / Surat Edaran Kabupaten'],
  ['100.3.5.2', 'Surat Perintah Bupati'],
  ['400.3', 'Pendidikan'],
  ['400.7', 'Kesehatan'],
  ['800.1.11.1', 'Surat Perintah Dinas/Surat Tugas'],
  ['900.1', 'Keuangan Daerah'],
])

for (const [code, expectedName] of requiredCodes) {
  const item = insertedCodes.find((candidate) => candidate.code === code)
  assert.ok(item, `missing required official code ${code}`)
  assert.equal(item.name, expectedName, `unexpected name for ${code}`)
}

const obsoleteCodes = [
  'PD',
  'PD.02',
  'PD.02.1',
  'HK',
  'HK.02',
  'HK.02.3',
  'KP',
  'KU',
  'PK',
  'PK.01',
  'PK.02',
  'PK.03',
  'UM',
  '005.1',
  '005.4',
  '005.8',
  '410',
  '440',
  '050',
]

for (const code of obsoleteCodes) {
  assert.equal(insertedCodeSet.has(code), false, `obsolete code should not be reinserted: ${code}`)
}

console.log(`Verified ${insertedCodes.length} Permendagri 83/2022 Pemda classification codes.`)
