import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Search, Filter, ChevronDown, Check, X,
  UserCheck, UserX, Shield, RefreshCw, Eye,
  Building2, MoreVertical, AlertTriangle, Edit2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

// ─── Types ─────────────────────────────────────────────────────────────────
type HakAkses = 'superadmin' | 'admin' | 'agendaris' | 'staf' | 'pimpinan'

interface UserRow {
  id: string
  hak: HakAkses
  is_agendaris: boolean
  id_instansi: string | null
  created_at: string
  nama: string
  nip: string | null
  jabatan: string | null
  golongan: string | null
  email: string | null
  aktif: boolean
  instansi_nama: string | null
  instansi_singkatan: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────
const HAK_OPTIONS: { value: HakAkses; label: string; color: string }[] = [
  { value: 'superadmin',  label: 'Superadmin',  color: 'bg-[#904d00] text-white' },
  { value: 'admin',       label: 'Admin OPD',   color: 'bg-[#0f766e] text-white' },
  { value: 'agendaris',   label: 'Agendaris',   color: 'bg-blue-600 text-white' },
  { value: 'pimpinan',    label: 'Pimpinan',    color: 'bg-purple-600 text-white' },
  { value: 'staf',        label: 'Staf',        color: 'bg-[#6e7977] text-white' },
]

const HAK_LABEL: Record<HakAkses, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin OPD',
  agendaris: 'Agendaris',
  staf: 'Staf',
  pimpinan: 'Pimpinan',
}

const HAK_COLOR: Record<HakAkses, string> = {
  superadmin:  'bg-[#fef3e2] text-[#904d00] border border-[#fe932c]/30',
  admin:       'bg-[#f0fdf4] text-[#0f766e] border border-[#0f766e]/30',
  agendaris:   'bg-blue-50 text-blue-700 border border-blue-200',
  pimpinan:    'bg-purple-50 text-purple-700 border border-purple-200',
  staf:        'bg-[#f1f4f3] text-[#3e4947] border border-[#d6dbd9]',
}

// ─── Fetch ──────────────────────────────────────────────────────────────────
// Relasi: user_profiles.nip → karyawan.nip  (bukan via id)
// Sehingga join dilakukan via nip, lalu karyawan data di-map terpisah
async function fetchAllUsers(): Promise<UserRow[]> {
  // Ambil user_profiles + instansi
  const { data: profiles, error: profErr } = await supabase
    .from('user_profiles')
    .select(`
      id, hak, is_agendaris, id_instansi, created_at, nip,
      instansi:id_instansi ( nama, singkatan )
    `)
    .order('created_at', { ascending: false })

  if (profErr || !profiles || profiles.length === 0) return []

  // Kumpulkan semua NIP untuk fetch karyawan sekali
  const nips = profiles.map((p: any) => p.nip).filter(Boolean)

  const { data: karyawanList } = nips.length > 0
    ? await supabase
        .from('karyawan')
        .select('nip, nama, jabatan, golongan, email, aktif')
        .in('nip', nips)
    : { data: [] }

  // Buat lookup map nip → karyawan
  const karyawanMap = new Map<string, any>(
    (karyawanList ?? []).map((k: any) => [k.nip, k])
  )

  return profiles.map((row: any) => {
    const k = karyawanMap.get(row.nip) ?? null
    return {
      id:                   row.id,
      hak:                  row.hak,
      is_agendaris:         row.is_agendaris,
      id_instansi:          row.id_instansi,
      created_at:           row.created_at,
      nama:                 k?.nama         ?? '—',
      nip:                  row.nip         ?? null,
      jabatan:              k?.jabatan      ?? null,
      golongan:             k?.golongan     ?? null,
      email:                k?.email        ?? null,
      aktif:                k?.aktif        ?? true,
      instansi_nama:        (row.instansi as any)?.nama      ?? null,
      instansi_singkatan:   (row.instansi as any)?.singkatan ?? null,
    }
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────
async function updateUserHak(userId: string, hak: HakAkses) {
  const { error } = await supabase
    .from('user_profiles')
    .update({ hak })
    .eq('id', userId)
  if (error) throw error
}

async function toggleUserAktif(nip: string, aktif: boolean) {
  const { error } = await supabase
    .from('karyawan')
    .update({ aktif })
    .eq('nip', nip)
  if (error) throw error
}

// ─── Stats Card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[#e5e9e7] p-5 flex items-center gap-4"
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#181c1c]">{value}</div>
        <div className="text-xs text-[#6e7977] font-medium">{label}</div>
      </div>
    </motion.div>
  )
}

// ─── Role Dropdown ───────────────────────────────────────────────────────────
function RoleDropdown({ userId, currentHak, onChanged }: {
  userId: string; currentHak: HakAkses; onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  const mut = useMutation({
    mutationFn: ({ uid, hak }: { uid: string; hak: HakAkses }) => updateUserHak(uid, hak),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      addToast({ type: 'success', message: 'Hak akses berhasil diubah' })
      onChanged()
    },
    onError: () => addToast({ type: 'error', message: 'Gagal mengubah hak akses' }),
  })

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium hover:opacity-80 transition-opacity"
      >
        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', HAK_COLOR[currentHak])}>
          {HAK_LABEL[currentHak]}
        </span>
        <ChevronDown size={12} className="text-[#6e7977]" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full mt-1 z-20 bg-white border border-[#e5e9e7] rounded-xl shadow-lg py-1 min-w-[140px]"
          >
            {HAK_OPTIONS.filter(h => h.value !== 'superadmin').map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  mut.mutate({ uid: userId, hak: opt.value })
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-[#f1f4f3] transition-colors',
                  currentHak === opt.value && 'bg-[#f1f4f3] font-semibold'
                )}
              >
                {currentHak === opt.value && <Check size={11} className="text-[#0f766e] flex-shrink-0" />}
                {currentHak !== opt.value && <span className="w-[11px] flex-shrink-0" />}
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      {open && <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />}
    </div>
  )
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────
function UserDetailDrawer({ user, onClose }: { user: UserRow; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="fixed right-0 top-0 h-screen w-[340px] bg-white border-l border-[#e5e9e7] z-50 flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e5e9e7]">
          <h3 className="font-bold text-[#181c1c] text-base">Detail Pengguna</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#904d00] to-[#fe932c] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {user.nama.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-[#181c1c] text-base leading-tight">{user.nama}</div>
              <div className="text-xs text-[#6e7977] mt-0.5">{user.nip ?? '—'}</div>
              <span className={cn('inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold', HAK_COLOR[user.hak])}>
                {HAK_LABEL[user.hak]}
              </span>
            </div>
          </div>

          {/* Fields */}
          {([
            ['Jabatan', user.jabatan ?? '—'],
            ['Golongan', user.golongan ?? '—'],
            ['Email', user.email ?? '—'],
            ['OPD', user.instansi_nama ?? '—'],
            ['Status', user.aktif ? 'Aktif' : 'Non-aktif'],
            ['Bergabung', new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold text-[#6e7977] uppercase tracking-widest">{label}</span>
              <span className={cn('text-sm font-medium', label === 'Status' ? (user.aktif ? 'text-[#0f766e]' : 'text-[#ba1a1a]') : 'text-[#181c1c]')}>{val}</span>
            </div>
          ))}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [search, setSearch]         = useState('')
  const [filterHak, setFilterHak]   = useState<HakAkses | 'semua'>('semua')
  const [filterOPD, setFilterOPD]   = useState('semua')
  const [filterAktif, setFilterAktif] = useState<'semua' | 'aktif' | 'nonaktif'>('semua')
  const [detailUser, setDetailUser] = useState<UserRow | null>(null)
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: fetchAllUsers,
  })

  const toggleMut = useMutation({
    mutationFn: ({ nip, aktif }: { nip: string; aktif: boolean }) => toggleUserAktif(nip, aktif),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      addToast({ type: 'success', message: 'Status pengguna diperbarui' })
    },
    onError: () => addToast({ type: 'error', message: 'Gagal memperbarui status' }),
  })

  // Unique OPDs for filter
  const opdList = useMemo(() => {
    const seen = new Set<string>()
    const list: { singkatan: string; nama: string }[] = []
    users.forEach(u => {
      if (u.instansi_singkatan && !seen.has(u.instansi_singkatan)) {
        seen.add(u.instansi_singkatan)
        list.push({ singkatan: u.instansi_singkatan, nama: u.instansi_nama ?? u.instansi_singkatan })
      }
    })
    return list.sort((a, b) => a.singkatan.localeCompare(b.singkatan))
  }, [users])

  // Filtered
  const filtered = useMemo(() => {
    return users.filter(u => {
      const q = search.toLowerCase()
      const matchSearch = !q || u.nama.toLowerCase().includes(q) || (u.nip ?? '').includes(q)
      const matchHak    = filterHak === 'semua' || u.hak === filterHak
      const matchOPD    = filterOPD === 'semua' || u.instansi_singkatan === filterOPD
      const matchAktif  = filterAktif === 'semua' || (filterAktif === 'aktif' ? u.aktif : !u.aktif)
      return matchSearch && matchHak && matchOPD && matchAktif
    })
  }, [users, search, filterHak, filterOPD, filterAktif])

  // Stats
  const stats = useMemo(() => ({
    total:   users.length,
    aktif:   users.filter(u => u.aktif).length,
    admin:   users.filter(u => u.hak === 'admin').length,
    opd:     opdList.length,
  }), [users, opdList])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Page title */}
      <div>
        <h1 className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
          Manajemen Pengguna
        </h1>
        <p className="text-sm text-[#6e7977] mt-1">Kelola semua pengguna dari seluruh OPD Kabupaten Mamberamo Raya</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Pengguna"   value={stats.total}  icon={Users}      color="bg-[#fe932c]" />
        <StatCard label="Pengguna Aktif"   value={stats.aktif}  icon={UserCheck}  color="bg-[#0f766e]" />
        <StatCard label="Admin OPD"        value={stats.admin}  icon={Shield}     color="bg-[#904d00]" />
        <StatCard label="OPD Terdaftar"    value={stats.opd}    icon={Building2}  color="bg-blue-600"  />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap gap-3 items-center p-4 border-b border-[#e5e9e7]">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau NIP…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#f7faf9] border border-[#e5e9e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f766e]/20 focus:border-[#0f766e]"
            />
          </div>

          {/* Filter Hak */}
          <div className="relative">
            <select
              value={filterHak}
              onChange={e => setFilterHak(e.target.value as HakAkses | 'semua')}
              className="pl-3 pr-8 py-2 text-sm bg-[#f7faf9] border border-[#e5e9e7] rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c] text-[#3e4947]"
            >
              <option value="semua">Semua Role</option>
              {HAK_OPTIONS.filter(h => h.value !== 'superadmin').map(h => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
            <Filter size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
          </div>

          {/* Filter OPD */}
          <div className="relative">
            <select
              value={filterOPD}
              onChange={e => setFilterOPD(e.target.value)}
              className="pl-3 pr-8 py-2 text-sm bg-[#f7faf9] border border-[#e5e9e7] rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c] text-[#3e4947]"
            >
              <option value="semua">Semua OPD</option>
              {opdList.map(o => (
                <option key={o.singkatan} value={o.singkatan}>{o.singkatan}</option>
              ))}
            </select>
            <Building2 size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
          </div>

          {/* Filter Status */}
          <div className="relative">
            <select
              value={filterAktif}
              onChange={e => setFilterAktif(e.target.value as typeof filterAktif)}
              className="pl-3 pr-8 py-2 text-sm bg-[#f7faf9] border border-[#e5e9e7] rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c] text-[#3e4947]"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Non-aktif</option>
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
          </div>

          {/* Refresh */}
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl border border-[#e5e9e7] bg-[#f7faf9] text-[#6e7977] hover:text-[#fe932c] hover:border-[#fe932c]/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>

          <span className="text-xs text-[#6e7977] ml-auto font-medium">{filtered.length} pengguna</span>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-[3px] border-[#fe932c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#6e7977]">
            <Users size={32} className="opacity-30" />
            <p className="text-sm">Tidak ada pengguna ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e9e7] text-[#6e7977]">
                  {['Pengguna', 'OPD', 'Jabatan', 'Role', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-[#f1f4f3] hover:bg-[#fdf8f4] transition-colors"
                  >
                    {/* Pengguna */}
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#904d00] to-[#fe932c] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {u.nama.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#181c1c] leading-tight">{u.nama}</div>
                          <div className="text-[11px] text-[#6e7977]">{u.nip ?? '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* OPD */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold bg-[#f1f4f3] text-[#3e4947] px-2 py-0.5 rounded-lg">
                        {u.instansi_singkatan ?? '—'}
                      </span>
                    </td>

                    {/* Jabatan */}
                    <td className="px-4 py-3.5 text-[#3e4947] text-xs">{u.jabatan ?? '—'}</td>

                    {/* Role dropdown */}
                    <td className="px-4 py-3.5">
                      {u.hak === 'superadmin' ? (
                        <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', HAK_COLOR.superadmin)}>
                          Superadmin
                        </span>
                      ) : (
                        <RoleDropdown
                          userId={u.id}
                          currentHak={u.hak}
                          onChanged={() => {}}
                        />
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold',
                        u.aktif
                          ? 'bg-[#f0fdf4] text-[#0f766e]'
                          : 'bg-[#fff0f0] text-[#ba1a1a]'
                      )}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', u.aktif ? 'bg-[#0f766e]' : 'bg-[#ba1a1a]')} />
                        {u.aktif ? 'Aktif' : 'Non-aktif'}
                      </span>
                    </td>

                    {/* Aksi */}
                    <td className="pl-4 pr-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setDetailUser(u)}
                          className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977] hover:text-[#fe932c] transition-colors"
                          title="Lihat detail"
                        >
                          <Eye size={14} />
                        </button>
                        {u.hak !== 'superadmin' && u.nip && (
                          <button
                            onClick={() => toggleMut.mutate({ nip: u.nip!, aktif: !u.aktif })}
                            className={cn(
                              'p-1.5 rounded-lg transition-colors',
                              u.aktif
                                ? 'hover:bg-[#fff0f0] text-[#6e7977] hover:text-[#ba1a1a]'
                                : 'hover:bg-[#f0fdf4] text-[#6e7977] hover:text-[#0f766e]'
                            )}
                            title={u.aktif ? 'Non-aktifkan' : 'Aktifkan'}
                          >
                            {u.aktif ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {detailUser && <UserDetailDrawer user={detailUser} onClose={() => setDetailUser(null)} />}
    </motion.div>
  )
}
