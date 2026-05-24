import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Building2, Users, FolderOpen, Mail,
  TrendingUp, ArrowUpRight, Calendar,
  BarChart3, Activity, Shield,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

// ─── Types ─────────────────────────────────────────────────────────────────
interface OPDStat {
  singkatan: string
  nama: string
  surat_masuk: number
  surat_keluar: number
  arsip: number
  users: number
}

interface DashboardStats {
  total_opd: number
  total_users: number
  total_arsip: number
  total_surat_masuk: number
  total_surat_keluar: number
  opd_stats: OPDStat[]
}

const EMPTY_STATS: DashboardStats = {
  total_opd: 0, total_users: 0, total_arsip: 0,
  total_surat_masuk: 0, total_surat_keluar: 0, opd_stats: [],
}

// ─── Fetch ──────────────────────────────────────────────────────────────────
async function fetchDashboardStats(): Promise<DashboardStats> {
  const [opdRes, userRes, arsipRes, smRes, skRes, instansiListRes, arsipAllRes] = await Promise.all([
    supabase.from('instansi').select('id', { count: 'exact', head: true }),
    supabase.from('karyawan').select('id', { count: 'exact', head: true }),
    supabase.from('arsip').select('id', { count: 'exact', head: true }),
    supabase.from('surat_masuk').select('id', { count: 'exact', head: true }),
    supabase.from('surat_keluar').select('id', { count: 'exact', head: true }),
    supabase.from('instansi').select('id, nama, singkatan').order('nama'),
    supabase.from('arsip').select('id_instansi'),
  ])

  const instansiList = instansiListRes.data ?? []
  const allArsip     = arsipAllRes.data ?? []

  const arsipCount = new Map<string, number>()
  allArsip.forEach((a: any) => {
    if (a.id_instansi) arsipCount.set(a.id_instansi, (arsipCount.get(a.id_instansi) ?? 0) + 1)
  })

  const opd_stats: OPDStat[] = instansiList.map((inst: any) => ({
    singkatan:   inst.singkatan ?? inst.nama,
    nama:        inst.nama,
    surat_masuk: 0,
    surat_keluar: 0,
    arsip:       arsipCount.get(inst.id) ?? 0,
    users:       0,
  }))

  return {
    total_opd:          opdRes.count  ?? 0,
    total_users:        userRes.count ?? 0,
    total_arsip:        arsipRes.count ?? 0,
    total_surat_masuk:  smRes.count   ?? 0,
    total_surat_keluar: skRes.count   ?? 0,
    opd_stats,
  }
}

// ─── Stat Card ───────────────────────────────────────────────────────────────
function BigStatCard({ label, value, sub, icon: Icon, gradient }: {
  label: string; value: number; sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  gradient: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl p-5 text-white relative overflow-hidden', gradient)}
    >
      <div className="relative z-10">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-3xl font-bold">{value.toLocaleString('id-ID')}</div>
            <div className="text-sm font-medium opacity-90 mt-0.5">{label}</div>
            {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
          </div>
          <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={22} />
          </div>
        </div>
      </div>
      {/* Decorative blob */}
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
    </motion.div>
  )
}

// ─── Bar Chart ───────────────────────────────────────────────────────────────
function MiniBarChart({ data, max, color }: { data: number[]; max: number; color: string }) {
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className={cn('flex-1 rounded-sm transition-all', color)}
          style={{ height: `${max > 0 ? (v / max) * 100 : 0}%`, minHeight: v > 0 ? '4px' : '2px' }}
        />
      ))}
    </div>
  )
}

const ACTIVITY_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  surat_masuk:  Mail,
  surat_keluar: Mail,
  arsip:        FolderOpen,
  user:         Users,
}

const ACTIVITY_COLOR: Record<string, string> = {
  surat_masuk:  'bg-blue-50 text-blue-600',
  surat_keluar: 'bg-purple-50 text-purple-600',
  arsip:        'bg-[#fef3e2] text-[#904d00]',
  user:         'bg-[#f0fdf4] text-[#0f766e]',
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { karyawan } = useAuthStore()

  const { data: stats = EMPTY_STATS, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: fetchDashboardStats,
  })

  const maxArsip = Math.max(...stats.opd_stats.map(o => o.arsip), 1)
  const maxSurat = Math.max(...stats.opd_stats.map(o => o.surat_masuk + o.surat_keluar), 1)

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-[#904d00] via-[#c46a00] to-[#fe932c] rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm opacity-80 font-medium">Selamat datang kembali,</p>
              <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                {karyawan?.nama ?? 'Administrator'}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-sm opacity-75">
                <Calendar size={14} />
                <span>{today}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Shield size={28} />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold">
              Admin Kabupaten Mamberamo Raya
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
              Sistem Aktif
            </div>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute top-4 right-16 w-20 h-20 rounded-full bg-white/5" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <BigStatCard label="Total OPD"          value={stats.total_opd}          icon={Building2}   gradient="bg-gradient-to-br from-[#904d00] to-[#fe932c]" />
        <BigStatCard label="Total Pengguna"      value={stats.total_users}         icon={Users}       gradient="bg-gradient-to-br from-[#005c55] to-[#0f766e]"   />
        <BigStatCard label="Total Arsip"         value={stats.total_arsip}         icon={FolderOpen}  gradient="bg-gradient-to-br from-[#1d4ed8] to-[#3b82f6]"   />
        <BigStatCard label="Surat Masuk"         value={stats.total_surat_masuk}   icon={Mail}        gradient="bg-gradient-to-br from-[#7c3aed] to-[#a855f7]"   />
        <BigStatCard label="Surat Keluar"        value={stats.total_surat_keluar}  icon={ArrowUpRight} gradient="bg-gradient-to-br from-[#0891b2] to-[#06b6d4]"  />
      </div>

      {/* Per-OPD table + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Per-OPD breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-[#e5e9e7]">
            <div className="w-8 h-8 rounded-lg bg-[#fef3e2] flex items-center justify-center">
              <BarChart3 size={16} className="text-[#904d00]" />
            </div>
            <h2 className="font-bold text-[#181c1c] text-sm">Rekap Per OPD</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-[3px] border-[#fe932c] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e9e7] text-[#6e7977]">
                    {['OPD', 'Surat Masuk', 'Surat Keluar', 'Arsip', 'Pengguna'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats.opd_stats.map((opd, i) => (
                    <motion.tr
                      key={opd.singkatan}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="border-b border-[#f1f4f3] hover:bg-[#fdf8f4] transition-colors"
                    >
                      <td className="pl-5 pr-4 py-3">
                        <div>
                          <span className="font-bold text-xs bg-[#fef3e2] text-[#904d00] border border-[#fe932c]/30 px-1.5 py-0.5 rounded">
                            {opd.singkatan}
                          </span>
                          <div className="text-[11px] text-[#6e7977] mt-0.5 max-w-[160px] truncate">{opd.nama}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#181c1c]">{opd.surat_masuk}</span>
                          <div className="w-16">
                            <MiniBarChart data={[opd.surat_masuk]} max={maxSurat} color="bg-[#7c3aed]/40" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#181c1c]">{opd.surat_keluar}</span>
                          <div className="w-16">
                            <MiniBarChart data={[opd.surat_keluar]} max={maxSurat} color="bg-[#0891b2]/40" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[#181c1c]">{opd.arsip}</span>
                          <div className="w-16">
                            <MiniBarChart data={[opd.arsip]} max={maxArsip} color="bg-[#fe932c]/50" />
                          </div>
                        </div>
                      </td>
                      <td className="pl-4 pr-5 py-3">
                        <div className="flex items-center gap-1 text-[#3e4947]">
                          <Users size={13} className="text-[#6e7977]" />
                          <span className="font-semibold">{opd.users}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-[#e5e9e7]">
            <div className="w-8 h-8 rounded-lg bg-[#f0fdf4] flex items-center justify-center">
              <Activity size={16} className="text-[#0f766e]" />
            </div>
            <h2 className="font-bold text-[#181c1c] text-sm">Aktivitas Terbaru</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-[#6e7977]">
            <Activity size={28} className="opacity-20" />
            <p className="text-xs">Belum ada aktivitas</p>
          </div>
        </div>
      </div>

      {/* Bar chart visual */}
      <div className="bg-white rounded-2xl border border-[#e5e9e7] p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#fef3e2] flex items-center justify-center">
            <TrendingUp size={16} className="text-[#904d00]" />
          </div>
          <h2 className="font-bold text-[#181c1c] text-sm">Volume Arsip per OPD</h2>
          <div className="flex items-center gap-4 ml-auto text-xs text-[#6e7977]">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#fe932c]" /> Arsip</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#0f766e]" /> Surat</div>
          </div>
        </div>

        <div className="flex items-end gap-4 h-32">
          {stats.opd_stats.map((opd) => {
            const arsipH = maxArsip > 0 ? (opd.arsip / maxArsip) * 100 : 0
            const suratH = maxSurat > 0 ? ((opd.surat_masuk + opd.surat_keluar) / maxSurat) * 100 : 0
            return (
              <div key={opd.singkatan} className="flex-1 flex flex-col items-center gap-1 group">
                <div className="flex items-end gap-0.5 h-24 w-full">
                  <div
                    className="flex-1 bg-[#fe932c] rounded-t-sm transition-all group-hover:bg-[#904d00]"
                    style={{ height: `${arsipH}%`, minHeight: opd.arsip > 0 ? '3px' : '0' }}
                    title={`Arsip: ${opd.arsip}`}
                  />
                  <div
                    className="flex-1 bg-[#0f766e] rounded-t-sm transition-all group-hover:bg-[#005c55]"
                    style={{ height: `${suratH}%`, minHeight: (opd.surat_masuk + opd.surat_keluar) > 0 ? '3px' : '0' }}
                    title={`Surat: ${opd.surat_masuk + opd.surat_keluar}`}
                  />
                </div>
                <div className="text-[10px] font-semibold text-[#6e7977] group-hover:text-[#fe932c] transition-colors">
                  {opd.singkatan}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
