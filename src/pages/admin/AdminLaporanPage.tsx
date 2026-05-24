import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3, Download, Filter, Calendar,
  Building2, FolderOpen, Mail, TrendingUp,
  FileText, ArrowUpRight, ArrowDownLeft,
  Printer,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Types ─────────────────────────────────────────────────────────────────
interface LaporanRow {
  opd: string
  opd_nama: string
  surat_masuk: number
  surat_keluar: number
  arsip_aktif: number
  arsip_inaktif: number
  arsip_vital: number
  total_arsip: number
  pengguna: number
}

async function fetchLaporan(): Promise<LaporanRow[]> {
  const [instansiRes, arsipRes] = await Promise.all([
    supabase.from('instansi').select('id, kode, nama, singkatan').order('kode'),
    supabase.from('arsip').select('id_instansi, status'),
  ])
  const instansiList = instansiRes.data ?? []
  const allArsip = arsipRes.data ?? []

  const arsipMap = new Map<string, { aktif: number; inaktif: number; vital: number; total: number }>()
  allArsip.forEach((a: any) => {
    if (!a.id_instansi) return
    const cur = arsipMap.get(a.id_instansi) ?? { aktif: 0, inaktif: 0, vital: 0, total: 0 }
    cur.total++
    if (a.status === 'aktif')    cur.aktif++
    if (a.status === 'inaktif')  cur.inaktif++
    if (a.status === 'vital')    cur.vital++
    arsipMap.set(a.id_instansi, cur)
  })

  return instansiList.map((inst: any) => {
    const counts = arsipMap.get(inst.id) ?? { aktif: 0, inaktif: 0, vital: 0, total: 0 }
    return {
      opd:           inst.singkatan ?? inst.kode,
      opd_nama:      inst.nama,
      surat_masuk:   0,
      surat_keluar:  0,
      arsip_aktif:   counts.aktif,
      arsip_inaktif: counts.inaktif,
      arsip_vital:   counts.vital,
      total_arsip:   counts.total,
      pengguna:      0,
    }
  })
}

// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportCSV(data: LaporanRow[], tahun: string) {
  const header = ['OPD', 'Nama OPD', 'Surat Masuk', 'Surat Keluar', 'Arsip Aktif', 'Arsip Inaktif', 'Arsip Vital', 'Total Arsip', 'Pengguna']
  const rows = data.map(r => [
    r.opd, r.opd_nama,
    r.surat_masuk, r.surat_keluar,
    r.arsip_aktif, r.arsip_inaktif, r.arsip_vital, r.total_arsip,
    r.pengguna,
  ])
  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `laporan-arsip-mamraya-${tahun}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Summary Card ────────────────────────────────────────────────────────────
function SumCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number; sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#e5e9e7] p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
          <Icon size={18} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-[#6e7977]">{label}</span>
      </div>
      <div className="text-3xl font-bold text-[#181c1c]">{value.toLocaleString('id-ID')}</div>
      {sub && <div className="text-xs text-[#6e7977] mt-0.5">{sub}</div>}
    </motion.div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminLaporanPage() {
  const [tahun, setTahun]       = useState(new Date().getFullYear().toString())
  const [filterOPD, setFilterOPD] = useState('semua')
  const [mode, setMode]         = useState<'surat' | 'arsip'>('arsip')

  const { data: laporan = [], isLoading } = useQuery({
    queryKey: ['admin-laporan'],
    queryFn: fetchLaporan,
  })

  const filtered = useMemo(() => {
    if (filterOPD === 'semua') return laporan
    return laporan.filter(r => r.opd === filterOPD)
  }, [laporan, filterOPD])

  const totals = useMemo(() => ({
    surat_masuk:  filtered.reduce((s, r) => s + r.surat_masuk, 0),
    surat_keluar: filtered.reduce((s, r) => s + r.surat_keluar, 0),
    arsip:        filtered.reduce((s, r) => s + r.total_arsip, 0),
    arsip_vital:  filtered.reduce((s, r) => s + r.arsip_vital, 0),
  }), [filtered])

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Title */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
            Laporan Lintas OPD
          </h1>
          <p className="text-sm text-[#6e7977] mt-1">
            Rekap dan analisis data arsip & surat dari seluruh OPD Kabupaten Mamberamo Raya
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportCSV(filtered, tahun)}
            className="flex items-center gap-2 px-4 py-2.5 border border-[#e5e9e7] bg-white text-[#3e4947] text-sm font-semibold rounded-xl hover:border-[#fe932c] hover:text-[#fe932c] transition-colors"
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#904d00] to-[#fe932c] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
          >
            <Printer size={15} /> Cetak
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-2xl border border-[#e5e9e7] p-4">
        <div className="flex items-center gap-2">
          <Calendar size={15} className="text-[#6e7977]" />
          <select
            value={tahun}
            onChange={e => setTahun(e.target.value)}
            className="text-sm font-medium bg-[#f7faf9] border border-[#e5e9e7] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c]"
          >
            {years.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-[#6e7977]" />
          <select
            value={filterOPD}
            onChange={e => setFilterOPD(e.target.value)}
            className="text-sm font-medium bg-[#f7faf9] border border-[#e5e9e7] rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c]"
          >
            <option value="semua">Semua OPD</option>
            {laporan.map(r => <option key={r.opd} value={r.opd}>{r.opd} — {r.opd_nama}</option>)}
          </select>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 ml-auto bg-[#f1f4f3] rounded-xl p-1">
          {(['arsip', 'surat'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all',
                mode === m ? 'bg-white shadow-sm text-[#904d00]' : 'text-[#6e7977] hover:text-[#3e4947]'
              )}
            >
              {m === 'arsip' ? 'Arsip' : 'Surat'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SumCard label="Surat Masuk"   value={totals.surat_masuk}  icon={ArrowDownLeft}  color="bg-[#7c3aed]" sub={`Tahun ${tahun}`} />
        <SumCard label="Surat Keluar"  value={totals.surat_keluar} icon={ArrowUpRight}   color="bg-[#0891b2]" sub={`Tahun ${tahun}`} />
        <SumCard label="Total Arsip"   value={totals.arsip}        icon={FolderOpen}     color="bg-[#fe932c]" sub="Semua kategori" />
        <SumCard label="Arsip Vital"   value={totals.arsip_vital}  icon={FileText}       color="bg-[#ba1a1a]" sub="Perlindungan khusus" />
      </div>

      {/* Main table */}
      <div className="bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-[#e5e9e7]">
          <div className="w-8 h-8 rounded-lg bg-[#fef3e2] flex items-center justify-center">
            <BarChart3 size={16} className="text-[#904d00]" />
          </div>
          <h2 className="font-bold text-[#181c1c] text-sm">
            {mode === 'arsip' ? 'Data Arsip per OPD' : 'Data Surat per OPD'} — Tahun {tahun}
          </h2>
          <span className="ml-auto text-xs text-[#6e7977] font-medium">{filtered.length} OPD</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-[3px] border-[#fe932c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            {mode === 'arsip' ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e9e7] text-[#6e7977]">
                    {['OPD', 'Nama OPD', 'Arsip Aktif', 'Arsip Inaktif', 'Arsip Vital', 'Total', 'Pengguna'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <motion.tr key={r.opd} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-[#f1f4f3] hover:bg-[#fdf8f4] transition-colors"
                    >
                      <td className="pl-5 pr-4 py-3.5">
                        <span className="font-bold text-xs bg-[#fef3e2] text-[#904d00] border border-[#fe932c]/30 px-2 py-0.5 rounded-lg">{r.opd}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[#3e4947] text-xs max-w-[180px] truncate">{r.opd_nama}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[#0f766e]">{r.arsip_aktif}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[#904d00]">{r.arsip_inaktif}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-[#ba1a1a]">{r.arsip_vital}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-[#181c1c]">{r.total_arsip}</span>
                      </td>
                      <td className="pl-4 pr-5 py-3.5 text-[#6e7977] font-semibold">{r.pengguna}</td>
                    </motion.tr>
                  ))}
                  {/* Total row */}
                  <tr className="border-t-2 border-[#fe932c]/30 bg-[#fef3e2]">
                    <td className="pl-5 pr-4 py-3.5 font-bold text-[#904d00] text-xs">TOTAL</td>
                    <td className="px-4 py-3.5 text-xs text-[#904d00] font-semibold">Semua OPD</td>
                    <td className="px-4 py-3.5 font-bold text-[#0f766e]">{filtered.reduce((s,r)=>s+r.arsip_aktif,0)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#904d00]">{filtered.reduce((s,r)=>s+r.arsip_inaktif,0)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#ba1a1a]">{filtered.reduce((s,r)=>s+r.arsip_vital,0)}</td>
                    <td className="px-4 py-3.5 font-bold text-[#181c1c]">{totals.arsip}</td>
                    <td className="pl-4 pr-5 py-3.5 font-bold text-[#181c1c]">{filtered.reduce((s,r)=>s+r.pengguna,0)}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e9e7] text-[#6e7977]">
                    {['OPD', 'Nama OPD', 'Surat Masuk', 'Surat Keluar', 'Total Surat'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <motion.tr key={r.opd} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-[#f1f4f3] hover:bg-[#fdf8f4] transition-colors"
                    >
                      <td className="pl-5 pr-4 py-3.5">
                        <span className="font-bold text-xs bg-[#fef3e2] text-[#904d00] border border-[#fe932c]/30 px-2 py-0.5 rounded-lg">{r.opd}</span>
                      </td>
                      <td className="px-4 py-3.5 text-[#3e4947] text-xs max-w-[200px] truncate">{r.opd_nama}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft size={13} className="text-[#7c3aed]" />
                          <span className="font-semibold text-[#181c1c]">{r.surat_masuk}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight size={13} className="text-[#0891b2]" />
                          <span className="font-semibold text-[#181c1c]">{r.surat_keluar}</span>
                        </div>
                      </td>
                      <td className="pl-4 pr-5 py-3.5">
                        <span className="font-bold text-[#181c1c]">{r.surat_masuk + r.surat_keluar}</span>
                      </td>
                    </motion.tr>
                  ))}
                  <tr className="border-t-2 border-[#fe932c]/30 bg-[#fef3e2]">
                    <td className="pl-5 pr-4 py-3.5 font-bold text-[#904d00] text-xs">TOTAL</td>
                    <td className="px-4 py-3.5 text-xs text-[#904d00] font-semibold">Semua OPD</td>
                    <td className="px-4 py-3.5 font-bold text-[#7c3aed]">{totals.surat_masuk}</td>
                    <td className="px-4 py-3.5 font-bold text-[#0891b2]">{totals.surat_keluar}</td>
                    <td className="pl-4 pr-5 py-3.5 font-bold text-[#181c1c]">{totals.surat_masuk + totals.surat_keluar}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="bg-[#fef3e2] border border-[#fe932c]/30 rounded-2xl p-4 flex items-start gap-3">
        <TrendingUp size={18} className="text-[#904d00] flex-shrink-0 mt-0.5" />
        <div className="text-sm text-[#904d00]">
          <span className="font-semibold">Catatan:</span> Data laporan diperbarui secara otomatis saat OPD menginput data arsip.
        </div>
      </div>
    </motion.div>
  )
}
