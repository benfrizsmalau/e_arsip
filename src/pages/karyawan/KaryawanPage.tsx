import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Download, Edit2, Trash2, Eye,
  X, Users, UserCheck, UserX, Phone, Mail,
  Building2, AlertTriangle, ChevronDown,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/stores/uiStore'
import type { Karyawan, Instansi } from '@/types/database'

// ─── Schema ───────────────────────────────────────────────────────────────────
const karyawanSchema = z.object({
  nip:          z.string().min(1, 'NIP wajib diisi'),
  nama:         z.string().min(3, 'Nama minimal 3 karakter'),
  jabatan:      z.string().optional(),
  golongan:     z.string().optional(),
  id_instansi:  z.string().optional(),
  email:        z.string().email('Format email tidak valid').optional().or(z.literal('')),
  tipe:         z.enum(['struktural', 'pelaksana']),
  aktif:        z.boolean(),
})
type KaryawanForm = z.infer<typeof karyawanSchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function tipeBadge(tipe: Karyawan['tipe']) {
  return tipe === 'struktural'
    ? <Badge variant="primary" size="sm"><UserCheck size={10} /> Struktural</Badge>
    : <Badge variant="neutral" size="sm"><Users size={10} /> Pelaksana</Badge>
}

function aktifBadge(aktif: boolean) {
  return aktif
    ? <Badge variant="success" size="sm">Aktif</Badge>
    : <Badge variant="error"   size="sm">Nonaktif</Badge>
}

// ─── Avatar placeholder ────────────────────────────────────────────────────────
function Avatar({ nama, fotoUrl }: { nama: string; fotoUrl: string | null }) {
  const initials = nama.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  if (fotoUrl) return <img src={fotoUrl} alt={nama} className="w-9 h-9 rounded-full object-cover" />
  return (
    <div className="w-9 h-9 rounded-full bg-[#ccfbf1] flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-[#0f766e]">{initials}</span>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function KaryawanModal({
  open, onClose, editing, instansiList, onSave,
}: {
  open: boolean
  onClose: () => void
  editing: Karyawan | null
  instansiList: Instansi[]
  onSave: (data: KaryawanForm) => Promise<void>
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<KaryawanForm>({
    resolver: zodResolver(karyawanSchema),
    defaultValues: { tipe: 'pelaksana', aktif: true },
  })

  useEffect(() => {
    if (editing) {
      reset({
        nip:         editing.nip,
        nama:        editing.nama,
        jabatan:     editing.jabatan ?? '',
        golongan:    editing.golongan ?? '',
        id_instansi: editing.id_instansi ?? '',
        email:       editing.email ?? '',
        tipe:        editing.tipe,
        aktif:       editing.aktif,
      })
    } else {
      reset({ tipe: 'pelaksana', aktif: true })
    }
  }, [editing])

  async function submit(data: KaryawanForm) {
    await onSave(data)
    reset()
    onClose()
  }

  const selectClass = 'w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#e5e9e7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ccfbf1] flex items-center justify-center">
                  <Users size={16} className="text-[#0f766e]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {editing ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}
                  </h3>
                  <p className="text-xs text-[#6e7977]">Data pegawai instansi</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
              {/* NIP & Nama */}
              <div className="grid grid-cols-2 gap-4">
                <Input label="NIP" placeholder="18 digit NIP" required error={errors.nip?.message} {...register('nip')} />
                <Input label="Nama Lengkap" placeholder="Nama pegawai" required error={errors.nama?.message} {...register('nama')} />
              </div>

              {/* Jabatan & Golongan */}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jabatan" placeholder="cth: Kepala Bidang" {...register('jabatan')} />
                <Input label="Golongan" placeholder="cth: III/c" {...register('golongan')} />
              </div>

              {/* Instansi */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Instansi / OPD</label>
                <div className="relative">
                  <select className={selectClass} {...register('id_instansi')}>
                    <option value="">— Pilih Instansi —</option>
                    {instansiList.map((ins) => (
                      <option key={ins.id} value={ins.id}>{ins.nama}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
                </div>
              </div>

              {/* Email */}
              <Input label="Email" type="email" placeholder="pegawai@mamraya.go.id" error={errors.email?.message} {...register('email')} />

              {/* Tipe */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Tipe Pegawai</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['struktural', 'pelaksana'] as const).map((val) => (
                    <label key={val} className="relative cursor-pointer">
                      <input type="radio" value={val} className="sr-only peer" {...register('tipe')} />
                      <div className="rounded-[10px] border-2 border-[#e5e9e7] px-3 py-2.5 text-center text-xs font-semibold text-[#6e7977] peer-checked:border-[#0f766e] peer-checked:bg-[#f0fdf9] peer-checked:text-[#0f766e] transition-all select-none capitalize">
                        {val}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Aktif */}
              <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#f7faf8] border border-[#e5e9e7]">
                <div>
                  <p className="text-sm font-semibold text-[#181c1c]">Status Aktif</p>
                  <p className="text-xs text-[#6e7977]">Apakah pegawai ini masih aktif?</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" {...register('aktif')} />
                  <div className="w-10 h-6 rounded-full bg-[#CBD5E1] peer-checked:bg-[#0f766e] transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting}>
                  {editing ? 'Simpan Perubahan' : 'Tambah Karyawan'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────
function DeleteConfirm({ open, onClose, onConfirm, item }: {
  open: boolean; onClose: () => void
  onConfirm: () => Promise<void>; item: Karyawan | null
}) {
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    await onConfirm()
    setLoading(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
                <AlertTriangle size={22} className="text-[#ba1a1a]" />
              </div>
              <h3 className="text-base font-bold text-[#181c1c] mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Hapus Data Karyawan?</h3>
              <p className="text-sm text-[#6e7977] mb-1">
                <span className="font-semibold text-[#181c1c]">{item.nama}</span>
              </p>
              <p className="text-xs text-[#6e7977] mb-1">NIP: {item.nip}</p>
              <p className="text-xs text-[#ba1a1a] mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
                <Button variant="destructive" className="flex-1" loading={loading} onClick={handleConfirm}>Hapus</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Detail Drawer ─────────────────────────────────────────────────────────────
function DetailDrawer({ item, instansiMap, onClose, onEdit }: {
  item: Karyawan | null; instansiMap: Map<string, string>
  onClose: () => void; onEdit: (k: Karyawan) => void
}) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Detail Karyawan</h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]"><X size={16} /></button>
              </div>

              <div className="space-y-5">
                {/* Avatar + Nama */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-[#f0fdf9] border border-[#99f6e4]">
                  <div className="w-14 h-14 rounded-full bg-[#ccfbf1] flex items-center justify-center flex-shrink-0">
                    {item.foto_url
                      ? <img src={item.foto_url} alt={item.nama} className="w-14 h-14 rounded-full object-cover" />
                      : <span className="text-xl font-bold text-[#0f766e]">{item.nama.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{item.nama}</p>
                    <p className="text-xs text-[#6e7977] font-mono mt-0.5">NIP: {item.nip}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {tipeBadge(item.tipe)}
                      {aktifBadge(item.aktif)}
                    </div>
                  </div>
                </div>

                {/* Details */}
                {[
                  { icon: <Building2 size={14} />, label: 'Jabatan', value: item.jabatan },
                  { icon: <Users size={14} />,     label: 'Golongan', value: item.golongan },
                  { icon: <Building2 size={14} />, label: 'Instansi', value: item.id_instansi ? instansiMap.get(item.id_instansi) : null },
                  { icon: <Mail size={14} />,       label: 'Email', value: item.email },
                  { icon: <Phone size={14} />,      label: 'Tipe', value: item.tipe === 'struktural' ? 'Struktural' : 'Pelaksana' },
                ].filter((r) => r.value).map((row) => (
                  <div key={row.label} className="flex items-start justify-between gap-4 py-3 border-b border-[#f1f4f3]">
                    <div className="flex items-center gap-2 text-[#6e7977]">
                      {row.icon}
                      <span className="text-xs font-semibold uppercase tracking-wider">{row.label}</span>
                    </div>
                    <span className="text-sm text-[#181c1c] text-right">{row.value}</span>
                  </div>
                ))}

                <Button className="w-full" onClick={() => { onClose(); onEdit(item) }}>
                  <Edit2 size={14} /> Edit Data
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function KaryawanPage() {
  const qc = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()

  const [search, setSearch]         = useState('')
  const [filterTipe, setFilterTipe] = useState<'all' | 'struktural' | 'pelaksana'>('all')
  const [filterAktif, setFilterAktif] = useState<'all' | 'aktif' | 'nonaktif'>('all')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Karyawan | null>(null)
  const [deleting, setDeleting]     = useState<Karyawan | null>(null)
  const [detail, setDetail]         = useState<Karyawan | null>(null)

  // ── Queries ──
  const { data: karyawanList = [], isLoading } = useQuery({
    queryKey: ['karyawan'],
    queryFn: async () => {
      const { data, error } = await supabase.from('karyawan').select('*').order('nama')
      if (error) return []
      return (data as Karyawan[]) ?? []
    },
  })

  const { data: instansiList = [] } = useQuery({
    queryKey: ['instansi'],
    queryFn: async () => {
      const { data } = await supabase.from('instansi').select('*').order('kode')
      return (data as Instansi[]) ?? []
    },
  })

  const instansiMap = useMemo(() => {
    const map = new Map<string, string>()
    instansiList.forEach((ins) => map.set(ins.id, ins.nama))
    return map
  }, [instansiList])

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: KaryawanForm; id?: string }) => {
      const payload = {
        nip:         data.nip,
        nama:        data.nama,
        jabatan:     data.jabatan || null,
        golongan:    data.golongan || null,
        id_instansi: data.id_instansi || null,
        email:       data.email || null,
        tipe:        data.tipe,
        aktif:       data.aktif,
      }
      if (id) {
        const { error } = await supabase.from('karyawan').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('karyawan').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['karyawan'] })
      showSuccess('Berhasil', vars.id ? 'Data karyawan berhasil diperbarui' : 'Karyawan baru berhasil ditambahkan')
    },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('karyawan').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['karyawan'] })
      showSuccess('Berhasil', 'Data karyawan berhasil dihapus')
    },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  // ── Filter ──
  const filtered = useMemo(() => {
    let result = karyawanList
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((k) =>
        k.nama.toLowerCase().includes(q) ||
        k.nip.includes(q) ||
        k.jabatan?.toLowerCase().includes(q) ||
        k.email?.toLowerCase().includes(q)
      )
    }
    if (filterTipe !== 'all') result = result.filter((k) => k.tipe === filterTipe)
    if (filterAktif === 'aktif')    result = result.filter((k) => k.aktif)
    if (filterAktif === 'nonaktif') result = result.filter((k) => !k.aktif)
    return result
  }, [karyawanList, search, filterTipe, filterAktif])

  // ── Stats ──
  const stats = useMemo(() => ({
    total:       karyawanList.length,
    struktural:  karyawanList.filter((k) => k.tipe === 'struktural').length,
    pelaksana:   karyawanList.filter((k) => k.tipe === 'pelaksana').length,
    aktif:       karyawanList.filter((k) => k.aktif).length,
  }), [karyawanList])

  // ── Export CSV ──
  function exportCSV() {
    const header = ['NIP', 'Nama', 'Jabatan', 'Golongan', 'Instansi', 'Email', 'Tipe', 'Aktif']
    const rows = filtered.map((k) => [
      k.nip,
      `"${k.nama}"`,
      k.jabatan ?? '',
      k.golongan ?? '',
      k.id_instansi ? (instansiMap.get(k.id_instansi) ?? '') : '',
      k.email ?? '',
      k.tipe,
      k.aktif ? 'Ya' : 'Tidak',
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Karyawan-Mamberamo-Raya-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
              Manajemen Karyawan
            </h1>
            <p className="text-sm text-[#6e7977] mt-0.5">
              Data pegawai dan pejabat seluruh instansi Kabupaten Mamberamo Raya
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={exportCSV}>
              Ekspor CSV
            </Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true) }}>
              Tambah Karyawan
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Pegawai',  value: stats.total,      icon: <Users size={16} />,      color: 'bg-[#ccfbf1] text-[#0f766e]' },
            { label: 'Struktural',     value: stats.struktural,  icon: <UserCheck size={16} />,  color: 'bg-[#dbeafe] text-[#1d4ed8]' },
            { label: 'Pelaksana',      value: stats.pelaksana,   icon: <Users size={16} />,      color: 'bg-[#f3e8ff] text-[#7c3aed]' },
            { label: 'Aktif',          value: stats.aktif,       icon: <UserCheck size={16} />,  color: 'bg-[#dcfce7] text-[#16a34a]' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 24 }}
            >
              <Card padding="sm" className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-xs text-[#6e7977]">{s.label}</p>
                  <p className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{s.value}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Toolbar */}
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, NIP, jabatan..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-[#CBD5E1] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 bg-white transition-all"
              />
            </div>
            {/* Filter Tipe */}
            <div className="flex items-center gap-1.5">
              {(['all', 'struktural', 'pelaksana'] as const).map((val) => {
                const labels = { all: 'Semua', struktural: 'Struktural', pelaksana: 'Pelaksana' }
                return (
                  <button
                    key={val}
                    onClick={() => setFilterTipe(val)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${filterTipe === val ? 'bg-[#0f766e] text-white' : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'}`}
                  >
                    {labels[val]}
                  </button>
                )
              })}
            </div>
            {/* Filter Aktif */}
            <div className="flex items-center gap-1.5">
              {(['all', 'aktif', 'nonaktif'] as const).map((val) => {
                const labels = { all: 'Semua Status', aktif: 'Aktif', nonaktif: 'Nonaktif' }
                return (
                  <button
                    key={val}
                    onClick={() => setFilterAktif(val)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${filterAktif === val ? 'bg-[#181c1c] text-white' : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'}`}
                  >
                    {labels[val]}
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#e5e9e7] bg-[#f7faf8]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Pegawai</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Jabatan</th>
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Instansi</th>
                  <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Tipe</th>
                  <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Status</th>
                  <th className="w-24 px-4 py-3 text-right text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f1f4f3]">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded-md bg-[#f1f4f3] animate-pulse" style={{ width: j === 0 ? '70%' : '50%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-[#6e7977] text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Users size={32} className="opacity-20" />
                        <p>Tidak ada data karyawan yang sesuai</p>
                        {search && (
                          <button onClick={() => setSearch('')} className="text-[#0f766e] text-xs font-semibold hover:underline">
                            Hapus pencarian
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item, i) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-[#f1f4f3] hover:bg-[#f7faf8] transition-colors group"
                    >
                      {/* Pegawai */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar nama={item.nama} fotoUrl={item.foto_url} />
                          <div>
                            <p className="text-sm font-semibold text-[#181c1c]">{item.nama}</p>
                            <p className="text-xs text-[#6e7977] font-mono">{item.nip}</p>
                            {item.email && <p className="text-xs text-[#0f766e]">{item.email}</p>}
                          </div>
                        </div>
                      </td>
                      {/* Jabatan */}
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm text-[#3e4947]">{item.jabatan ?? '—'}</p>
                          {item.golongan && <p className="text-xs text-[#6e7977]">Gol. {item.golongan}</p>}
                        </div>
                      </td>
                      {/* Instansi */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-[#6e7977] leading-tight">
                          {item.id_instansi ? instansiMap.get(item.id_instansi) ?? '—' : '—'}
                        </p>
                      </td>
                      {/* Tipe */}
                      <td className="px-4 py-3">{tipeBadge(item.tipe)}</td>
                      {/* Status */}
                      <td className="px-4 py-3">{aktifBadge(item.aktif)}</td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setDetail(item)}
                            className="p-1.5 rounded-lg hover:bg-[#ccfbf1] text-[#6e7977] hover:text-[#0f766e] transition-colors"
                            title="Detail"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => { setEditing(item); setModalOpen(true) }}
                            className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706] transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeleting(item)}
                            className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a] transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-[#f1f4f3] bg-[#f7faf8]">
              <p className="text-xs text-[#6e7977]">
                Menampilkan <span className="font-semibold text-[#181c1c]">{filtered.length}</span> dari{' '}
                <span className="font-semibold text-[#181c1c]">{karyawanList.length}</span> karyawan
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modals */}
      <KaryawanModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing}
        instansiList={instansiList}
        onSave={async (data) => {
          await saveMutation.mutateAsync({ data, id: editing?.id })
        }}
      />

      <DeleteConfirm
        open={!!deleting}
        onClose={() => setDeleting(null)}
        item={deleting}
        onConfirm={async () => {
          if (deleting) await deleteMutation.mutateAsync(deleting.id)
        }}
      />

      <DetailDrawer
        item={detail}
        instansiMap={instansiMap}
        onClose={() => setDetail(null)}
        onEdit={(k) => { setEditing(k); setModalOpen(true) }}
      />
    </>
  )
}
