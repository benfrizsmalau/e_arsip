import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Download, ChevronUp, ChevronDown,
  Edit2, Trash2, Eye, X, BookOpen, AlertTriangle, Filter,
  Archive, Clock, RotateCcw, CheckCircle2
} from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { fetchAllKlasifikasi } from '@/lib/klasifikasi'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/stores/uiStore'
import type { JRA, Klasifikasi } from '@/types/database'

// ─── Types ───────────────────────────────────────────────────────────────────
type JRAWithKlasifikasi = JRA & { klasifikasi?: Pick<Klasifikasi, 'kode' | 'nama'> | null }
type SortField = 'kode' | 'judul' | 'retensi_aktif' | 'retensi_inaktif' | 'nasib_akhir'
type SortDir = 'asc' | 'desc'

// ─── Schema ──────────────────────────────────────────────────────────────────
const jraSchema = z.object({
  kode:            z.string().min(1, 'Kode wajib diisi'),
  judul:           z.string().min(3, 'Judul minimal 3 karakter'),
  id_klasifikasi:  z.string().optional(),
  retensi_aktif:   z.coerce.number().min(0).optional(),
  retensi_inaktif: z.coerce.number().min(0).optional(),
  nasib_akhir:     z.enum(['permanen', 'musnah', 'dinilai_kembali']).optional(),
  keterangan:      z.string().optional(),
  dasar_hukum:     z.string().optional(),
})
type JRAForm = z.infer<typeof jraSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────
function nasibBadge(nasib: JRA['nasib_akhir']) {
  if (!nasib) return <Badge variant="neutral" size="sm">—</Badge>
  const map = {
    permanen:        { variant: 'success'  as const, icon: <CheckCircle2 size={10} />, label: 'Permanen' },
    musnah:          { variant: 'error'    as const, icon: <Trash2        size={10} />, label: 'Musnah' },
    dinilai_kembali: { variant: 'warning'  as const, icon: <RotateCcw     size={10} />, label: 'Dinilai Kembali' },
  }
  const { variant, icon, label } = map[nasib]
  return <Badge variant={variant} size="sm">{icon} {label}</Badge>
}

function retensiLabel(tahun?: number | null) {
  if (tahun === null || tahun === undefined) return '—'
  return tahun === 0 ? 'Seumur hidup' : `${tahun} tahun`
}

/** Badge peringatan berdasarkan total masa retensi (aktif + inaktif) */
function retensiWarning(aktif?: number | null, inaktif?: number | null) {
  const total = (aktif ?? 0) + (inaktif ?? 0)
  if (aktif === 0 || inaktif === 0) return null // seumur hidup / permanen
  if (total <= 2)  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a]"><AlertTriangle size={9} /> Sangat Singkat</span>
  if (total <= 5)  return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#fef3c7] text-[#d97706]"><AlertTriangle size={9} /> Singkat</span>
  return null
}

// ─── Modal ───────────────────────────────────────────────────────────────────
function JRAModal({
  open, onClose, editing, klasifikasiList, onSave,
}: {
  open: boolean
  onClose: () => void
  editing: JRAWithKlasifikasi | null
  klasifikasiList: Klasifikasi[]
  onSave: (data: JRAForm) => Promise<void>
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<JRAForm>({
    resolver: zodResolver(jraSchema) as Resolver<JRAForm>,
    defaultValues: {},
  })

  useEffect(() => {
    if (editing) {
      reset({
        kode:            editing.kode,
        judul:           editing.judul,
        id_klasifikasi:  editing.id_klasifikasi ?? '',
        retensi_aktif:   editing.retensi_aktif ?? undefined,
        retensi_inaktif: editing.retensi_inaktif ?? undefined,
        nasib_akhir:     editing.nasib_akhir ?? undefined,
        keterangan:      editing.keterangan ?? '',
        dasar_hukum:     editing.dasar_hukum ?? '',
      })
    } else {
      reset({})
    }
  }, [editing])

  async function submit(data: JRAForm) {
    await onSave(data)
    reset()
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
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
                  <BookOpen size={16} className="text-[#0f766e]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {editing ? 'Edit JRA' : 'Tambah JRA Baru'}
                  </h3>
                  <p className="text-xs text-[#6e7977]">Jadwal Retensi Arsip</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="Kode JRA" placeholder="cth: KP-01" required error={errors.kode?.message} {...register('kode')} />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                    Klasifikasi
                  </label>
                  <select
                    className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all"
                    {...register('id_klasifikasi')}
                  >
                    <option value="">— Pilih —</option>
                    {klasifikasiList.map((k) => (
                      <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>
                    ))}
                  </select>
                </div>
              </div>

              <Input label="Judul / Jenis Arsip" placeholder="Nama jenis arsip" required error={errors.judul?.message} {...register('judul')} />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Retensi Aktif (tahun)"
                  type="number"
                  min={0}
                  placeholder="Tahun"
                  hint="0 = seumur hidup"
                  error={errors.retensi_aktif?.message}
                  {...register('retensi_aktif')}
                />
                <Input
                  label="Retensi Inaktif (tahun)"
                  type="number"
                  min={0}
                  placeholder="Tahun"
                  hint="0 = seumur hidup"
                  error={errors.retensi_inaktif?.message}
                  {...register('retensi_inaktif')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                  Nasib Akhir <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['permanen', 'musnah', 'dinilai_kembali'] as const).map((val) => {
                    const labels = { permanen: 'Permanen', musnah: 'Musnah', dinilai_kembali: 'Dinilai Kembali' }
                    return (
                      <label key={val} className="relative cursor-pointer">
                        <input type="radio" value={val} className="sr-only peer" {...register('nasib_akhir')} />
                        <div className="rounded-[10px] border-2 border-[#e5e9e7] px-3 py-2.5 text-center text-xs font-semibold text-[#6e7977] peer-checked:border-[#0f766e] peer-checked:bg-[#f0fdf9] peer-checked:text-[#0f766e] transition-all select-none">
                          {labels[val]}
                        </div>
                      </label>
                    )
                  })}
                </div>
                {errors.nasib_akhir && <p className="text-xs text-[#ba1a1a]">⚠ {errors.nasib_akhir.message}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Keterangan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan..."
                  className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all resize-none"
                  {...register('keterangan')}
                />
              </div>

              <Input label="Dasar Hukum" placeholder="cth: UU No. 43 Tahun 2009" {...register('dasar_hukum')} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting}>
                  {editing ? 'Simpan Perubahan' : 'Tambah JRA'}
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
function DeleteConfirm({
  open, onClose, onConfirm, item,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  item: JRAWithKlasifikasi | null
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
                <AlertTriangle size={22} className="text-[#ba1a1a]" />
              </div>
              <h3 className="text-base font-bold text-[#181c1c] mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                Hapus Entri JRA?
              </h3>
              <p className="text-sm text-[#6e7977] mb-1">
                <span className="font-semibold text-[#181c1c]">{item.kode}</span> — {item.judul}
              </p>
              <p className="text-xs text-[#ba1a1a] mb-6">Tindakan ini tidak dapat dibatalkan.</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
                <Button variant="destructive" className="flex-1" loading={loading} onClick={handleConfirm}>
                  Hapus
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────
function DetailDrawer({ item, onClose }: { item: JRAWithKlasifikasi | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Detail JRA
                </h3>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-[#f0fdf9] border border-[#99f6e4] p-4">
                  <p className="text-2xl font-bold text-[#0f766e]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {item.kode}
                  </p>
                  <p className="text-sm text-[#3e4947] mt-1">{item.judul}</p>
                </div>

                {item.klasifikasi && (
                  <div className="flex items-center justify-between py-3 border-b border-[#e5e9e7]">
                    <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Klasifikasi</span>
                    <Badge variant="primary" size="sm">{item.klasifikasi.kode} — {item.klasifikasi.nama}</Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f7faf8] p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Clock size={13} className="text-[#0f766e]" />
                      <span className="text-xs font-semibold text-[#6e7977]">Retensi Aktif</span>
                    </div>
                    <p className="text-lg font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {retensiLabel(item.retensi_aktif)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7faf8] p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Archive size={13} className="text-[#0f766e]" />
                      <span className="text-xs font-semibold text-[#6e7977]">Retensi Inaktif</span>
                    </div>
                    <p className="text-lg font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {retensiLabel(item.retensi_inaktif)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-[#e5e9e7]">
                  <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Nasib Akhir</span>
                  {nasibBadge(item.nasib_akhir)}
                </div>

                {item.dasar_hukum && (
                  <div className="flex items-start justify-between gap-4 py-3 border-b border-[#e5e9e7]">
                    <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider shrink-0">Dasar Hukum</span>
                    <p className="text-sm text-[#181c1c] text-right">{item.dasar_hukum}</p>
                  </div>
                )}

                {item.keterangan && (
                  <div>
                    <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider block mb-2">Keterangan</span>
                    <p className="text-sm text-[#3e4947] leading-relaxed">{item.keterangan}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function JRAPage() {
  const qc = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()

  const [search, setSearch]           = useState('')
  const [filterNasib, setFilterNasib] = useState<string>('all')
  const [sortField, setSortField]     = useState<SortField>('kode')
  const [sortDir, setSortDir]         = useState<SortDir>('asc')
  const [modalOpen, setModalOpen]     = useState(false)
  const [editing, setEditing]         = useState<JRAWithKlasifikasi | null>(null)
  const [deleting, setDeleting]       = useState<JRAWithKlasifikasi | null>(null)
  const [detail, setDetail]           = useState<JRAWithKlasifikasi | null>(null)

  // ── Queries ──
  const { data: jraList = [], isLoading } = useQuery({
    queryKey: ['jra'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jra')
        .select('*, klasifikasi(kode, nama)')
        .order('kode')
      if (error) return []
      return (data as JRAWithKlasifikasi[]) ?? []
    },
  })

  const { data: klasifikasiList = [] } = useQuery({
    queryKey: ['klasifikasi'],
    queryFn: async () => {
      return fetchAllKlasifikasi<Klasifikasi>()
    },
  })

  // ── Mutations ──
  const saveMutation = useMutation({
    mutationFn: async ({ data, id }: { data: JRAForm; id?: string }) => {
      const payload = {
        kode:            data.kode,
        judul:           data.judul,
        id_klasifikasi:  data.id_klasifikasi || null,
        retensi_aktif:   data.retensi_aktif ?? null,
        retensi_inaktif: data.retensi_inaktif ?? null,
        nasib_akhir:     data.nasib_akhir ?? null,
        keterangan:      data.keterangan || null,
        dasar_hukum:     data.dasar_hukum || null,
      }
      if (id) {
        const { error } = await supabase.from('jra').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('jra').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['jra'] })
      showSuccess('Berhasil', vars.id ? 'JRA berhasil diperbarui' : 'JRA baru berhasil ditambahkan')
    },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('jra').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jra'] })
      showSuccess('Berhasil', 'Entri JRA berhasil dihapus')
    },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  // ── Filter & sort ──
  const filtered = useMemo(() => {
    let result = jraList
    if (search) {
      const q = search.toLowerCase()
      result = result.filter((j) =>
        j.kode.toLowerCase().includes(q) ||
        j.judul.toLowerCase().includes(q) ||
        j.klasifikasi?.nama?.toLowerCase().includes(q) ||
        j.dasar_hukum?.toLowerCase().includes(q)
      )
    }
    if (filterNasib !== 'all') {
      result = result.filter((j) => j.nasib_akhir === filterNasib)
    }
    return [...result].sort((a, b) => {
      let av: string | number | null = a[sortField] ?? ''
      let bv: string | number | null = b[sortField] ?? ''
      if (typeof av === 'string') av = av.toLowerCase()
      if (typeof bv === 'string') bv = bv.toLowerCase()
      if (av < bv) return sortDir === 'asc' ? -1 : 1
      if (av > bv) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [jraList, search, filterNasib, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={12} className="opacity-20" />
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  // ── Stats ──
  const stats = useMemo(() => ({
    total:         jraList.length,
    permanen:      jraList.filter((j) => j.nasib_akhir === 'permanen').length,
    musnah:        jraList.filter((j) => j.nasib_akhir === 'musnah').length,
    dinilai:       jraList.filter((j) => j.nasib_akhir === 'dinilai_kembali').length,
  }), [jraList])

  // ── Export CSV ──
  function exportCSV() {
    const header = ['Kode', 'Judul', 'Klasifikasi', 'Retensi Aktif', 'Retensi Inaktif', 'Nasib Akhir', 'Dasar Hukum']
    const rows = filtered.map((j) => [
      j.kode,
      `"${j.judul}"`,
      j.klasifikasi?.nama ?? '',
      retensiLabel(j.retensi_aktif),
      retensiLabel(j.retensi_inaktif),
      j.nasib_akhir ?? '',
      j.dasar_hukum ?? '',
    ])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `JRA-Mamberamo-Raya-${new Date().toISOString().slice(0, 10)}.csv`
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
              Jadwal Retensi Arsip
            </h1>
            <p className="text-sm text-[#6e7977] mt-0.5">
              Pengelolaan masa simpan dan nasib akhir arsip berdasarkan peraturan kearsipan
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<Download size={14} />} onClick={exportCSV}>
              Ekspor CSV
            </Button>
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true) }}>
              Tambah JRA
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Entri',     value: stats.total,    icon: <BookOpen size={16} />,   color: 'bg-[#ccfbf1] text-[#0f766e]' },
            { label: 'Permanen',        value: stats.permanen, icon: <CheckCircle2 size={16} />, color: 'bg-[#dcfce7] text-[#16a34a]' },
            { label: 'Musnah',          value: stats.musnah,   icon: <Trash2 size={16} />,    color: 'bg-[#ffdad6] text-[#ba1a1a]' },
            { label: 'Dinilai Kembali', value: stats.dinilai,  icon: <RotateCcw size={16} />, color: 'bg-[#fef3c7] text-[#d97706]' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 24 }}
            >
              <Card padding="sm" className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs text-[#6e7977]">{s.label}</p>
                  <p className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {s.value}
                  </p>
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
                placeholder="Cari kode, judul, atau klasifikasi..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-[#CBD5E1] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 bg-white transition-all"
              />
            </div>
            {/* Filter */}
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-[#6e7977]" />
              {(['all', 'permanen', 'musnah', 'dinilai_kembali'] as const).map((val) => {
                const labels = { all: 'Semua', permanen: 'Permanen', musnah: 'Musnah', dinilai_kembali: 'Dinilai' }
                return (
                  <button
                    key={val}
                    onClick={() => setFilterNasib(val)}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${
                      filterNasib === val
                        ? 'bg-[#0f766e] text-white'
                        : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'
                    }`}
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
                  {([
                    { field: 'kode'          as SortField, label: 'Kode', w: 'w-24' },
                    { field: 'judul'         as SortField, label: 'Judul / Jenis Arsip', w: '' },
                    { field: 'retensi_aktif' as SortField, label: 'Aktif', w: 'w-24' },
                    { field: 'retensi_inaktif' as SortField, label: 'Inaktif', w: 'w-24' },
                    { field: 'nasib_akhir'   as SortField, label: 'Nasib Akhir', w: 'w-40' },
                  ]).map((col) => (
                    <th
                      key={col.field}
                      onClick={() => toggleSort(col.field)}
                      className={`${col.w} px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider cursor-pointer hover:text-[#0f766e] select-none`}
                    >
                      <span className="flex items-center gap-1">
                        {col.label} <SortIcon field={col.field} />
                      </span>
                    </th>
                  ))}
                  <th className="w-28 px-4 py-3 text-right text-xs font-semibold text-[#6e7977] uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-[#f1f4f3]">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 rounded-md bg-[#f1f4f3] animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-[#6e7977] text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <BookOpen size={32} className="opacity-20" />
                        <p>Tidak ada data JRA yang sesuai</p>
                        {search && (
                          <button
                            onClick={() => setSearch('')}
                            className="text-[#0f766e] text-xs font-semibold hover:underline"
                          >
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
                      transition={{ delay: i * 0.025 }}
                      className="border-b border-[#f1f4f3] hover:bg-[#f7faf8] transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] bg-[#ccfbf1] text-[#0f766e] text-xs font-bold font-mono">
                          {item.kode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-[#181c1c] leading-tight">{item.judul}</p>
                          {item.klasifikasi && (
                            <p className="text-xs text-[#6e7977] mt-0.5">{item.klasifikasi.nama}</p>
                          )}
                          {item.dasar_hukum && (
                            <p className="text-xs text-[#0f766e] mt-0.5">{item.dasar_hukum}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#3e4947] font-medium">
                        {retensiLabel(item.retensi_aktif)}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#3e4947] font-medium">
                        {retensiLabel(item.retensi_inaktif)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {nasibBadge(item.nasib_akhir)}
                          {retensiWarning(item.retensi_aktif, item.retensi_inaktif)}
                        </div>
                      </td>
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
                <span className="font-semibold text-[#181c1c]">{jraList.length}</span> entri JRA
              </p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Modals */}
      <JRAModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing}
        klasifikasiList={klasifikasiList}
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

      <DetailDrawer item={detail} onClose={() => setDetail(null)} />
    </>
  )
}
