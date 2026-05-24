import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const BPKPAD_ID = '431b6594-b84d-4182-a116-70fd79a9a8b4'
const LS_KEY    = 'pajak_sync_last_at'

const supabaseExt = createClient(
  import.meta.env.VITE_EXT_SUPABASE_URL as string,
  import.meta.env.VITE_EXT_SUPABASE_SERVICE_KEY as string,
  { auth: { persistSession: false } }
)

export type SyncResult = {
  inserted: number
  skipped:  number
  source:   'ketetapan' | 'pembayaran'
}

export type SyncSummary = {
  ketetapan: SyncResult
  pembayaran: SyncResult
  syncedAt: string
}

export function getLastSyncAt(): string | null {
  return localStorage.getItem(LS_KEY)
}

function saveLastSyncAt(ts: string) {
  localStorage.setItem(LS_KEY, ts)
}

// Ambil set nomor_surat yang sudah ada di surat_keluar BPKPAD
async function fetchExistingNomor(): Promise<Set<string>> {
  const { data } = await supabase
    .from('surat_keluar')
    .select('nomor_surat')
    .eq('id_instansi', BPKPAD_ID)
  return new Set((data ?? []).map((r: { nomor_surat: string }) => r.nomor_surat))
}

// Sync SKPD + SKRD dari tabel ketetapan
async function syncKetetapan(
  existing: Set<string>,
  createdBy: string | null,
  since: string | null
): Promise<SyncResult> {
  let q = supabaseExt
    .from('ketetapan')
    .select('*, wajib_pajak(nama_usaha, nama_pemilik)')
    .in('jenis_ketetapan', ['SKPD', 'SKRD'])
    .order('created_at', { ascending: true })

  if (since) q = q.gt('created_at', since)

  const { data, error } = await q
  if (error) throw new Error('Sync ketetapan gagal: ' + error.message)
  if (!data?.length) return { inserted: 0, skipped: 0, source: 'ketetapan' }

  const baru = data.filter((r: any) => !existing.has(r.nomor_ketetapan))
  if (!baru.length) return { inserted: 0, skipped: data.length, source: 'ketetapan' }

  const rows = baru.map((r: any) => ({
    nomor_agenda:  r.nomor_ketetapan,
    nomor_surat:   r.nomor_ketetapan,
    tujuan:        r.wajib_pajak?.nama_usaha || r.wajib_pajak?.nama_pemilik || 'Wajib Pajak',
    perihal:       `${r.jenis_ketetapan} ${r.jenis_pajak ?? ''} - ${r.masa_pajak ?? ''} ${r.tahun_pajak ?? ''}`.trim(),
    tanggal_surat: r.tanggal_ketetapan,
    sifat:         'biasa'    as const,
    status:        'terkirim' as const,
    id_instansi:   BPKPAD_ID,
    id_klasifikasi: null,
    penandatangan:  null,
    created_by:    createdBy,
    created_at:    r.created_at,
  }))

  const { error: insErr, data: inserted } = await supabase
    .from('surat_keluar')
    .upsert(rows, { onConflict: 'nomor_agenda', ignoreDuplicates: true })
    .select('id')
  if (insErr) throw new Error('Upsert ketetapan gagal: ' + insErr.message)

  return { inserted: inserted?.length ?? 0, skipped: data.length - (inserted?.length ?? 0), source: 'ketetapan' }
}

// Sync SSPD + SSRD dari tabel pembayaran (skip BATAL)
async function syncPembayaran(
  existing: Set<string>,
  createdBy: string | null,
  since: string | null
): Promise<SyncResult> {
  let q = supabaseExt
    .from('pembayaran')
    .select('*, wajib_pajak(nama_usaha, nama_pemilik)')
    .neq('status', 'BATAL')
    .order('created_at', { ascending: true })

  if (since) q = q.gt('created_at', since)

  const { data, error } = await q
  if (error) throw new Error('Sync pembayaran gagal: ' + error.message)
  if (!data?.length) return { inserted: 0, skipped: 0, source: 'pembayaran' }

  const baru = data.filter((r: any) => !existing.has(r.nomor_bayar))
  if (!baru.length) return { inserted: 0, skipped: data.length, source: 'pembayaran' }

  const rows = baru.map((r: any) => ({
    nomor_agenda:  r.nomor_bayar,
    nomor_surat:   r.nomor_bayar,
    tujuan:        r.wajib_pajak?.nama_usaha || r.wajib_pajak?.nama_pemilik || 'Wajib Pajak',
    perihal:       r.keterangan || r.nomor_bayar,
    tanggal_surat: (r.tanggal_bayar as string).split('T')[0],
    sifat:         'biasa'    as const,
    status:        'terkirim' as const,
    id_instansi:   BPKPAD_ID,
    id_klasifikasi: null,
    penandatangan:  null,
    created_by:    createdBy,
    created_at:    r.created_at,
  }))

  const { error: insErr, data: inserted } = await supabase
    .from('surat_keluar')
    .upsert(rows, { onConflict: 'nomor_agenda', ignoreDuplicates: true })
    .select('id')
  if (insErr) throw new Error('Upsert pembayaran gagal: ' + insErr.message)

  return { inserted: inserted?.length ?? 0, skipped: data.length - (inserted?.length ?? 0), source: 'pembayaran' }
}

// Entry point utama — dipanggil dari SuratPage
export async function syncAllPajak(createdBy: string | null): Promise<SyncSummary> {
  const since    = getLastSyncAt()
  const existing = await fetchExistingNomor()

  const [ketetapan, pembayaran] = await Promise.all([
    syncKetetapan(existing, createdBy, since),
    syncPembayaran(existing, createdBy, since),
  ])

  const syncedAt = new Date().toISOString()
  saveLastSyncAt(syncedAt)
  return { ketetapan, pembayaran, syncedAt }
}
