import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const helperPath = new URL('../src/lib/klasifikasi.ts', import.meta.url)
const suratPath = new URL('../src/pages/surat/SuratPage.tsx', import.meta.url)
const arsipPath = new URL('../src/pages/arsip/ArsipPage.tsx', import.meta.url)
const jraPath = new URL('../src/pages/jra/JRAPage.tsx', import.meta.url)

const helper = readFileSync(helperPath, 'utf8')
assert.match(helper, /PAGE_SIZE\s*=\s*1000/)
assert.match(helper, /\.range\(\s*from\s*,\s*to\s*\)/)
assert.match(helper, /\.length\s*<\s*PAGE_SIZE/)
assert.match(helper, /compareClassificationCodes/)
assert.match(helper, /\.sort\(/)

for (const path of [suratPath, arsipPath, jraPath]) {
  const source = readFileSync(path, 'utf8')
  assert.match(source, /fetchAllKlasifikasi/, `${path.pathname} should use fetchAllKlasifikasi`)
  assert.doesNotMatch(
    source,
    /from\('klasifikasi'\)\s*\.select/,
    `${path.pathname} should not fetch klasifikasi without pagination`,
  )
}

console.log('Verified paginated klasifikasi loading.')
