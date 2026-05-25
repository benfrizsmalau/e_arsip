import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Edit2, Trash2, X, ChevronDown,
  Mail, Send, AlertTriangle, FileText, Inbox,
  CheckCircle2, Clock, Archive, Hash, BookOpen, Sparkles, PenLine,
  RefreshCw, FolderOpen, FileSpreadsheet, Building2,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { syncAllPajak, getLastSyncAt, BPKPAD_ID, type SyncSummary } from '@/lib/syncPajak'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { fetchAllKlasifikasi, buildKlasifikasiTree, type KlasifikasiOption, type KlasifikasiNode } from '@/lib/klasifikasi'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, generateNomorAgenda, generateNomorArsip } from '@/lib/utils'
import type { SuratMasuk, SuratKeluar } from '@/types/database'

// ─── Schemas ──────────────────────────────────────────────────────────────────
const masukSchema = z.object({
  asal_surat:     z.string().min(1, 'Asal surat wajib diisi'),
  nomor_surat:    z.string().min(1, 'Nomor surat wajib diisi'),
  tanggal_surat:  z.string().min(1, 'Tanggal wajib diisi'),
  tanggal_terima: z.string().min(1, 'Tanggal terima wajib diisi'),
  perihal:        z.string().min(3, 'Perihal minimal 3 karakter'),
  sifat:          z.enum(['biasa', 'penting', 'rahasia', 'sangat_segera']),
  disposisi_kepada: z.string().optional(),
})
type MasukForm = z.infer<typeof masukSchema>

const keluarSchema = z.object({
  tujuan:               z.string().min(1, 'Tujuan wajib diisi'),
  id_klasifikasi:       z.string().optional(),
  nomor_surat_manual:   z.string().optional(),
  tanggal_surat:        z.string().min(1, 'Tanggal wajib diisi'),
  perihal:              z.string().min(3, 'Perihal minimal 3 karakter'),
  sifat:                z.enum(['biasa', 'penting', 'rahasia', 'sangat_segera']),
  penandatangan:        z.string().optional(),
})
type KeluarForm = z.infer<typeof keluarSchema>
type NomorMode = 'otomatis' | 'manual'
type KeluarFormWithNomor = KeluarForm & { nomor_surat: string }

// ─── Tujuan helpers (supports JSON-array or legacy plain string) ─────────────
function parseTujuanToTags(val: string): string[] {
  if (!val) return []
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) return parsed.filter(Boolean)
  } catch { /* not JSON */ }
  return [val]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sifatBadge = (sifat: string) => {
  const map: Record<string, { v: 'neutral' | 'warning' | 'error' | 'purple'; l: string }> = {
    biasa:         { v: 'neutral', l: 'Biasa' },
    penting:       { v: 'warning', l: 'Penting' },
    rahasia:       { v: 'error',   l: 'Rahasia' },
    sangat_segera: { v: 'purple',  l: 'Sangat Segera' },
  }
  const { v, l } = Object.hasOwn(map, sifat) ? map[sifat] : { v: 'neutral' as const, l: sifat }
  return <Badge variant={v} size="sm">{l}</Badge>
}

const masukStatusBadge = (s: string) => {
  const map: Record<string, { v: 'info' | 'warning' | 'success' | 'neutral'; l: string; icon: React.ReactNode }> = {
    baru:        { v: 'info',    l: 'Baru',       icon: <Inbox size={11} /> },
    diproses:    { v: 'warning', l: 'Diproses',   icon: <Clock size={11} /> },
    selesai:     { v: 'success', l: 'Selesai',    icon: <CheckCircle2 size={11} /> },
    diarsipkan:  { v: 'neutral', l: 'Diarsipkan', icon: <Archive size={11} /> },
  }
  const { v, l, icon } = Object.hasOwn(map, s) ? map[s] : { v: 'neutral' as const, l: s, icon: null }
  return <Badge variant={v} size="sm">{icon} {l}</Badge>
}

const keluarStatusBadge = (s: string) => {
  type E = { v: 'neutral' | 'warning' | 'success' | 'info'; l: string; icon: React.ReactNode }
  const entries: [string, E][] = [
    ['draft',        { v: 'neutral', l: 'Draft',        icon: <FileText size={11} /> }],
    ['menunggu_ttd', { v: 'warning', l: 'Menunggu TTD', icon: <Clock size={11} /> }],
    ['terkirim',     { v: 'success', l: 'Terkirim',     icon: <Send size={11} /> }],
    ['diarsipkan',   { v: 'info',    l: 'Diarsipkan',   icon: <Archive size={11} /> }],
  ]
  const { v, l, icon } = entries.find(([k]) => k === s)?.[1] ?? { v: 'neutral' as const, l: s, icon: null }
  return <Badge variant={v} size="sm">{icon} {l}</Badge>
}

// ─── Surat Masuk Modal ────────────────────────────────────────────────────────
function MasukModal({ open, onClose, editing, onSave }: {
  open: boolean; onClose: () => void; editing: SuratMasuk | null; onSave: (d: MasukForm) => Promise<void>
}) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MasukForm>({
    resolver: zodResolver(masukSchema),
    defaultValues: editing ? { asal_surat: editing.asal_surat, nomor_surat: editing.nomor_surat, tanggal_surat: editing.tanggal_surat, tanggal_terima: editing.tanggal_terima, perihal: editing.perihal, sifat: editing.sifat, disposisi_kepada: editing.disposisi_kepada ?? '' } : { sifat: 'biasa', tanggal_terima: new Date().toISOString().slice(0, 10) },
  })

  // Reset form saat editing berubah (defaultValues hanya dibaca sekali saat mount)
  useEffect(() => {
    if (editing) {
      reset({
        asal_surat: editing.asal_surat,
        nomor_surat: editing.nomor_surat,
        tanggal_surat: editing.tanggal_surat,
        tanggal_terima: editing.tanggal_terima,
        perihal: editing.perihal,
        sifat: editing.sifat,
        disposisi_kepada: editing.disposisi_kepada ?? '',
      })
    } else {
      reset({ sifat: 'biasa', tanggal_terima: new Date().toISOString().slice(0, 10) })
    }
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(d: MasukForm) { await onSave(d); reset(); onClose() }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e9e7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#dbeafe] flex items-center justify-center"><Inbox size={16} className="text-[#2563eb]" /></div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{editing ? 'Edit Surat Masuk' : 'Catat Surat Masuk'}</h3>
                  <p className="text-xs text-[#6e7977]">Agenda surat masuk</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
              <Input label="Asal Surat / Pengirim" placeholder="Nama instansi atau pejabat pengirim" required error={errors.asal_surat?.message} {...register('asal_surat')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nomor Surat" placeholder="Nomor agenda surat" required error={errors.nomor_surat?.message} {...register('nomor_surat')} />
                <Input label="Tanggal Surat" type="date" required error={errors.tanggal_surat?.message} {...register('tanggal_surat')} />
              </div>
              <Input label="Tanggal Terima" type="date" required error={errors.tanggal_terima?.message} {...register('tanggal_terima')} />
              <Input label="Perihal" placeholder="Isi singkat surat" required error={errors.perihal?.message} {...register('perihal')} />
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Sifat Surat</label>
                <select className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all" {...register('sifat')}>
                  <option value="biasa">Biasa</option>
                  <option value="penting">Penting</option>
                  <option value="rahasia">Rahasia</option>
                  <option value="sangat_segera">Sangat Segera</option>
                </select>
              </div>
              <Input label="Disposisi Kepada (opsional)" placeholder="Nama pejabat tujuan disposisi" {...register('disposisi_kepada')} />
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting}>{editing ? 'Simpan' : 'Catat Surat'}</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── TujuanTagInput ───────────────────────────────────────────────────────────
function TujuanTagInput({ tags, onChange, error }: {
  tags: string[]
  onChange: (tags: string[]) => void
  error?: string
}) {
  const [inputVal, setInputVal] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTag = (val: string) => {
    const trimmed = val.trim()
    if (trimmed && !tags.includes(trimmed)) onChange([...tags, trimmed])
    setInputVal('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(inputVal) }
    else if ((e.key === ',' || e.key === ';') && inputVal) { e.preventDefault(); addTag(inputVal) }
    else if (e.key === 'Backspace' && !inputVal && tags.length > 0) onChange(tags.slice(0, -1))
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
        Tujuan <span className="text-[#ba1a1a]">*</span>
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-[42px] w-full rounded-[10px] border ${error ? 'border-[#ba1a1a] ring-2 ring-[#ba1a1a]/15' : 'border-[#CBD5E1] focus-within:border-[#0f766e] focus-within:ring-2 focus-within:ring-[#0f766e]/15'} bg-white px-3 py-2 flex flex-wrap gap-1.5 transition-all cursor-text`}
      >
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-[#f0fdf4] text-[#15803d] text-xs font-semibold px-2.5 py-1 rounded-full border border-[#bbf7d0]">
            <span className="truncate max-w-[180px]">{tag}</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(tags.filter((_, j) => j !== i)) }}
              className="flex-shrink-0 text-[#15803d] hover:text-[#ba1a1a] transition-colors"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => { if (inputVal.trim()) addTag(inputVal) }}
          placeholder={tags.length === 0 ? 'Ketik nama instansi/pejabat, tekan Enter' : 'Tambah tujuan lain...'}
          className="flex-1 min-w-[160px] outline-none text-sm text-[#181c1c] placeholder:text-[#bdc9c6] bg-transparent py-0.5"
        />
      </div>
      {error && <p className="text-xs text-[#ba1a1a]">⚠ {error}</p>}
      <p className="text-[11px] text-[#6e7977]">
        {tags.length > 0 ? `${tags.length} tujuan • ` : ''}Tekan Enter atau koma (,) untuk menambah tujuan
      </p>
    </div>
  )
}

// ─── Surat Keluar Modal ───────────────────────────────────────────────────────
function KeluarModal({ open, onClose, editing, onSave }: {
  open: boolean; onClose: () => void; editing: SuratKeluar | null
  onSave: (d: KeluarFormWithNomor) => Promise<void>
}) {
  const { profile } = useAuthStore()
  const { error: showError } = useToast()
  const [nomorMode, setNomorMode]           = useState<NomorMode>('otomatis')
  const [klasifikasiList, setKlasifikasiList] = useState<KlasifikasiOption[]>([])
  const [previewNomor, setPreviewNomor]       = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview]   = useState(false)
  const [linkedJRA, setLinkedJRA] = useState<{ kode: string; judul: string; retensi_aktif: number | null; retensi_inaktif: number | null; nasib_akhir: string | null }[]>([])
  const [tujuanTags, setTujuanTags] = useState<string[]>([])
  const [selectedPath, setSelectedPath] = useState<KlasifikasiNode[]>([])

  const { register, handleSubmit, reset, watch, setValue, setError, formState: { errors, isSubmitting } } = useForm<KeluarForm>({
    resolver: zodResolver(keluarSchema),
    defaultValues: editing
      ? { tujuan: editing.tujuan, id_klasifikasi: (editing as any).id_klasifikasi ?? '', tanggal_surat: editing.tanggal_surat, perihal: editing.perihal, sifat: editing.sifat, penandatangan: editing.penandatangan ?? '', nomor_surat_manual: editing.nomor_surat ?? '' }
      : { sifat: 'biasa', tanggal_surat: new Date().toISOString().slice(0, 10) },
  })

  const watchedKlas = watch('id_klasifikasi')

  // Reset seluruh form saat editing berubah (defaultValues hanya dibaca sekali saat mount)
  useEffect(() => {
    if (editing) {
      reset({
        tujuan: editing.tujuan,
        id_klasifikasi: (editing as any).id_klasifikasi ?? '',
        tanggal_surat: editing.tanggal_surat,
        perihal: editing.perihal,
        sifat: editing.sifat,
        penandatangan: editing.penandatangan ?? '',
        nomor_surat_manual: editing.nomor_surat ?? '',
      })
    } else {
      reset({ sifat: 'biasa', tanggal_surat: new Date().toISOString().slice(0, 10) })
    }
    const tags = editing ? parseTujuanToTags(editing.tujuan) : []
    setTujuanTags(tags)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync tujuan tags → form field value
  useEffect(() => {
    setValue('tujuan', tujuanTags.length > 0 ? JSON.stringify(tujuanTags) : '', { shouldValidate: false })
  }, [tujuanTags, setValue])

  // Load klasifikasi list once
  useEffect(() => {
    let cancelled = false
    fetchAllKlasifikasi<KlasifikasiOption>('id, kode, nama')
      .then((data) => { if (!cancelled) setKlasifikasiList(data) })
      .catch(() => { if (!cancelled) setKlasifikasiList([]) })
    return () => { cancelled = true }
  }, [])

  // Preview nomor surat whenever klasifikasi changes (otomatis mode only)
  useEffect(() => {
    if (nomorMode !== 'otomatis' || !watchedKlas || !profile?.id_instansi || editing) {
      setPreviewNomor(null); return
    }
    setLoadingPreview(true)
    supabase.rpc('preview_nomor_surat', { p_id_instansi: profile.id_instansi, p_id_klasifikasi: watchedKlas })
      .then(({ data }) => setPreviewNomor(data as string | null))
      .finally(() => setLoadingPreview(false))
  }, [watchedKlas, profile?.id_instansi, editing, nomorMode])

  // Fetch JRA linked to selected klasifikasi
  useEffect(() => {
    if (!watchedKlas) { setLinkedJRA([]); return }
    supabase.from('jra')
      .select('kode, judul, retensi_aktif, retensi_inaktif, nasib_akhir')
      .eq('id_klasifikasi', watchedKlas)
      .order('kode')
      .then(({ data }) => setLinkedJRA((data ?? []) as typeof linkedJRA))
  }, [watchedKlas])

  async function submit(d: KeluarForm) {
    let nomor_surat = editing?.nomor_surat ?? ''

    if (!editing) {
      if (nomorMode === 'otomatis') {
        // Validasi klasifikasi wajib dipilih
        if (!d.id_klasifikasi) {
          setError('id_klasifikasi', { message: 'Pilih klasifikasi surat' }); return
        }
        if (!profile?.id_instansi) { showError('Gagal', 'Data instansi tidak ditemukan'); return }
        const { data: gen, error: genErr } = await supabase.rpc('generate_nomor_surat', {
          p_id_instansi: profile.id_instansi, p_id_klasifikasi: d.id_klasifikasi,
        })
        if (genErr) { showError('Gagal', 'Tidak dapat generate nomor surat: ' + genErr.message); return }
        nomor_surat = gen as string
      } else {
        // Validasi nomor manual wajib diisi
        if (!d.nomor_surat_manual?.trim()) {
          setError('nomor_surat_manual', { message: 'Nomor surat wajib diisi' }); return
        }
        nomor_surat = d.nomor_surat_manual.trim()
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nomor_surat_manual: _omit, ...rest } = d
    await onSave({ ...rest, nomor_surat })
    reset()
    setTujuanTags([])
    setPreviewNomor(null)
    setNomorMode('otomatis')
    setSelectedPath([])
    onClose()
  }

  // Pohon hierarki klasifikasi (dibangun dari flat list)
  const tree = useMemo(() => buildKlasifikasiTree(klasifikasiList), [klasifikasiList])

  // Handler cascade: level = indeks dropdown (0 = root, 1 = anak root, dst.)
  function handleCascadeChange(level: number, id: string) {
    if (!id) {
      const newPath = selectedPath.slice(0, level)
      setSelectedPath(newPath)
      setValue('id_klasifikasi', newPath[newPath.length - 1]?.id ?? '')
      return
    }
    const options = level === 0 ? tree : (selectedPath[level - 1]?.children ?? [])
    const node = options.find(n => n.id === id)
    if (!node) return
    const newPath = [...selectedPath.slice(0, level), node]
    setSelectedPath(newPath)
    setValue('id_klasifikasi', node.id)
  }

  // Reset path saat modal dibuka/tutup
  useEffect(() => { setSelectedPath([]) }, [open])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5e9e7]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#dcfce7] flex items-center justify-center"><Send size={16} className="text-[#16a34a]" /></div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{editing ? 'Edit Surat Keluar' : 'Buat Surat Keluar'}</h3>
                  <p className="text-xs text-[#6e7977]">Nomor surat digenerate otomatis</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">

              {/* ── Toggle Mode Nomor — hanya untuk surat baru ── */}
              {!editing && (
                <div className="flex rounded-[10px] border border-[#e5e9e7] overflow-hidden bg-[#f8f9fa] p-1 gap-1">
                  {([
                    { key: 'otomatis', icon: <Sparkles size={13} />, label: 'Nomor Otomatis' },
                    { key: 'manual',   icon: <PenLine size={13} />,  label: 'Nomor Manual'   },
                  ] as { key: NomorMode; icon: React.ReactNode; label: string }[]).map(opt => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setNomorMode(opt.key)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-xs font-semibold transition-all ${
                        nomorMode === opt.key
                          ? 'bg-white text-[#0f766e] shadow-sm border border-[#e5e9e7]'
                          : 'text-[#6e7977] hover:text-[#181c1c]'
                      }`}
                    >
                      {opt.icon}{opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Mode: Otomatis — Klasifikasi + Preview ── */}
              <AnimatePresence mode="wait">
              {(nomorMode === 'otomatis' || editing) && (
                <motion.div
                  key="otomatis"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  {/* Klasifikasi — cascading 2-step */}
                  {!editing && (
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                        Klasifikasi Surat <span className="text-[#ba1a1a]">*</span>
                      </label>

                      {/* Cascade dinamis — ditampilkan level per level */}
                      {Array.from({ length: selectedPath.length + 1 }, (_, level) => {
                        const levelLabels = ['Kategori Utama', 'Sub-Kategori', 'Sub-Sub-Kategori', 'Detail Klasifikasi']
                        const label = levelLabels[level] ?? `Level ${level + 1}`
                        const options: KlasifikasiNode[] = level === 0
                          ? tree
                          : (selectedPath[level - 1]?.children ?? [])

                        // Jangan tampilkan jika tidak ada pilihan
                        if (level > 0 && options.length === 0) return null

                        const isEnabled = level === 0 || !!selectedPath[level - 1]
                        const selectedValue = selectedPath[level]?.id ?? ''

                        return (
                          <div key={level} className="space-y-1">
                            <p className="text-[10px] font-semibold text-[#6e7977] uppercase tracking-wider flex items-center gap-1.5">
                              <span className={`w-4 h-4 rounded-full text-white text-[9px] flex items-center justify-center font-bold shrink-0 transition-colors ${isEnabled ? 'bg-[#0f766e]' : 'bg-[#bdc9c6]'}`}>
                                {level + 1}
                              </span>
                              {label}
                            </p>
                            <div className="relative">
                              {level === 0 && (
                                <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
                              )}
                              <select
                                className={`w-full rounded-[10px] border ${level === 0 ? 'pl-8' : 'pl-4'} pr-8 py-2.5 text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all appearance-none ${
                                  isEnabled
                                    ? 'border-[#CBD5E1] bg-white text-[#181c1c]'
                                    : 'border-[#e5e9e7] bg-[#f1f4f3] text-[#9ca3af] cursor-not-allowed'
                                }`}
                                disabled={!isEnabled}
                                value={selectedValue}
                                onChange={e => handleCascadeChange(level, e.target.value)}
                              >
                                <option value="">
                                  {level === 0 ? 'Pilih kategori utama...' : `— Pilih ${label.toLowerCase()}...`}
                                </option>
                                {options.map(n => (
                                  <option key={n.id} value={n.id}>{n.kode} — {n.nama}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
                            </div>
                            {/* Tampilkan error hanya di bawah dropdown terakhir yang aktif */}
                            {level === selectedPath.length && errors.id_klasifikasi && (
                              <p className="text-xs text-[#ba1a1a]">⚠ {errors.id_klasifikasi.message}</p>
                            )}
                          </div>
                        )
                      })}

                      {/* Badge kode terpilih — tampil hanya jika ada pilihan */}
                      {watchedKlas && (() => {
                        const sel = klasifikasiList.find(k => k.id === watchedKlas)
                        return sel ? (
                          <div className="flex items-center gap-2 px-3 py-2 bg-[#f0fdf4] border border-[#86efac] rounded-[10px]">
                            <CheckCircle2 size={13} className="text-[#16a34a] shrink-0" />
                            <span className="text-xs font-mono font-bold text-[#005c55] shrink-0">{sel.kode}</span>
                            <span className="text-xs text-[#6e7977]">—</span>
                            <span className="text-xs text-[#181c1c] font-medium truncate">{sel.nama}</span>
                          </div>
                        ) : null
                      })()}
                    </div>
                  )}

                  {/* Preview Nomor Otomatis */}
                  {!editing && (
                    <motion.div
                      animate={{ opacity: watchedKlas ? 1 : 0.5 }}
                      className={`rounded-[10px] border px-4 py-3 flex items-center gap-3 ${
                        previewNomor ? 'bg-[#f0faf9] border-[#a7f3d0]' : 'bg-[#f8f9fa] border-[#e5e9e7]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${previewNomor ? 'bg-[#0f766e]' : 'bg-[#e5e9e7]'}`}>
                        {loadingPreview
                          ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <Sparkles size={14} className={previewNomor ? 'text-white' : 'text-[#6e7977]'} />
                        }
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e7977]">Nomor Surat (Otomatis)</p>
                        <p className={`text-sm font-mono font-bold truncate ${previewNomor ? 'text-[#005c55]' : 'text-[#9ca3af]'}`}>
                          {loadingPreview ? 'Memuat…' : previewNomor ?? '—/—/—/—/—'}
                        </p>
                      </div>
                      <Hash size={14} className="text-[#6e7977] flex-shrink-0 ml-auto" />
                    </motion.div>
                  )}

                  {/* Existing nomor on edit */}
                  {editing && (
                    <div className="rounded-[10px] bg-[#f0faf9] border border-[#a7f3d0] px-4 py-3 flex items-center gap-3">
                      <Hash size={14} className="text-[#0f766e]" />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#6e7977]">Nomor Surat</p>
                        <p className="text-sm font-mono font-bold text-[#005c55]">{editing.nomor_surat}</p>
                      </div>
                    </div>
                  )}

                  {/* JRA Retensi Info */}
                  {linkedJRA.length > 0 && (
                    <div className="rounded-[10px] bg-[#fefce8] border border-[#fde68a] p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Clock size={12} className="text-[#d97706]" />
                        <span className="text-xs font-bold text-[#d97706] uppercase tracking-wide">Jadwal Retensi Terkait</span>
                      </div>
                      {linkedJRA.map((jra) => (
                        <div key={jra.kode} className="text-xs text-[#3e4947]">
                          <span className="font-mono font-semibold text-[#181c1c]">{jra.kode}</span>
                          <span className="mx-1 text-[#6e7977]">—</span>
                          <span>{jra.judul}</span>
                          <span className="ml-2 text-[#6e7977]">
                            Aktif <strong>{jra.retensi_aktif ?? '—'}</strong> thn / Inaktif <strong>{jra.retensi_inaktif ?? '—'}</strong> thn
                          </span>
                          {jra.nasib_akhir && (
                            <span className="ml-1 capitalize text-[#d97706] font-medium">→ {jra.nasib_akhir.replace(/_/g, ' ')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── Mode: Manual — input nomor langsung ── */}
              {nomorMode === 'manual' && !editing && (
                <motion.div
                  key="manual"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-2"
                >
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                      Nomor Surat <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <PenLine size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Contoh: 100.3.3.2/BPKAD/V/2026"
                        className="w-full rounded-[10px] border border-[#CBD5E1] bg-white pl-8 pr-4 py-2.5 text-sm font-mono text-[#181c1c] placeholder:text-[#bdc9c6] placeholder:font-sans focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all"
                        {...register('nomor_surat_manual')}
                      />
                    </div>
                    {errors.nomor_surat_manual && <p className="text-xs text-[#ba1a1a]">⚠ {errors.nomor_surat_manual.message}</p>}
                  </div>
                  <p className="text-[11px] text-[#6e7977] bg-[#fffbeb] border border-[#fde68a] rounded-[8px] px-3 py-2">
                    ⚠ Mode manual digunakan untuk surat yang nomornya sudah ada sebelum sistem ini digunakan. Counter nomor otomatis tidak akan bertambah.
                  </p>
                </motion.div>
              )}
              </AnimatePresence>

              <TujuanTagInput tags={tujuanTags} onChange={setTujuanTags} error={errors.tujuan?.message} />
              <Input label="Tanggal Surat" type="date" required error={errors.tanggal_surat?.message} {...register('tanggal_surat')} />
              <Input label="Perihal" placeholder="Isi singkat surat" required error={errors.perihal?.message} {...register('perihal')} />

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Sifat Surat</label>
                <select className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all" {...register('sifat')}>
                  <option value="biasa">Biasa</option>
                  <option value="penting">Penting</option>
                  <option value="rahasia">Rahasia</option>
                  <option value="sangat_segera">Sangat Segera</option>
                </select>
              </div>

              <Input label="Penandatangan (opsional)" placeholder="Nama pejabat penandatangan" {...register('penandatangan')} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting} rightIcon={<Sparkles size={14} />}>
                  {editing ? 'Simpan' : 'Terbitkan Surat'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Delete confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ open, onClose, onConfirm, label }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void>; label: string }) {
  const [loading, setLoading] = useState(false)
  async function go() { setLoading(true); await onConfirm(); setLoading(false); onClose() }
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4"><AlertTriangle size={22} className="text-[#ba1a1a]" /></div>
              <h3 className="text-base font-bold text-[#181c1c] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Hapus Surat?</h3>
              <p className="text-sm text-[#6e7977] mb-6">{label}</p>
              <div className="flex gap-3 w-full">
                <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
                <Button variant="destructive" className="flex-1" loading={loading} onClick={go}>Hapus</Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Sync Status Bar ─────────────────────────────────────────────────────────
function SyncBar({ syncing, lastSummary, lastAt, onSync }: {
  syncing: boolean
  lastSummary: SyncSummary | null
  lastAt: string | null
  onSync: () => void
}) {
  const fmt = (ts: string | null) => {
    if (!ts) return 'Belum pernah'
    const d = new Date(ts)
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  const total = lastSummary
    ? lastSummary.ketetapan.inserted + lastSummary.pembayaran.inserted
    : null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f0faf9] border border-[#a7f3d0] rounded-xl text-xs">
      <div className="flex items-center gap-1.5 text-[#0f766e]">
        {syncing
          ? <RefreshCw size={13} className="animate-spin" />
          : <RefreshCw size={13} />
        }
        <span className="font-semibold">Sync Pajak BPKPAD</span>
      </div>
      <div className="flex-1 text-[#6e7977]">
        {syncing
          ? 'Mengambil data terbaru...'
          : total !== null && total > 0
            ? <span className="text-[#0f766e] font-medium">{total} surat baru diimpor</span>
            : <span>Terakhir sync: {fmt(lastAt)}</span>
        }
      </div>
      <button
        onClick={onSync}
        disabled={syncing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f766e] text-white font-semibold hover:bg-[#0d6460] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
        {syncing ? 'Syncing...' : 'Sync Sekarang'}
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SuratPage() {
  const qc = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const [tab, setTab]           = useState<'masuk' | 'keluar' | 'pajak'>('masuk')
  const [search, setSearch]     = useState('')
  const [filterSifat, setFilter] = useState('all')

  const [masukModal, setMasukModal]   = useState(false)
  const [keluarModal, setKeluarModal] = useState(false)
  const [editMasuk, setEditMasuk]     = useState<SuratMasuk | null>(null)
  const [editKeluar, setEditKeluar]   = useState<SuratKeluar | null>(null)
  const [deleting, setDeleting]       = useState<{ id: string; label: string; type: 'masuk' | 'keluar' } | null>(null)

  // ── Sync Pajak ──
  const syncingRef                    = useRef(false)
  const [syncing, setSyncing]         = useState(false)
  const [lastSummary, setLastSummary] = useState<SyncSummary | null>(null)
  const [lastAt, setLastAt]           = useState<string | null>(getLastSyncAt)

  const runSync = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true
    setSyncing(true)
    try {
      const result = await syncAllPajak(profile?.id ?? null)
      setLastSummary(result)
      setLastAt(result.syncedAt)
      const total = result.ketetapan.inserted + result.pembayaran.inserted
      if (total > 0) {
        showSuccess('Sync berhasil', `${total} surat baru diimpor dari sistem pajak`)
        qc.invalidateQueries({ queryKey: ['surat_keluar'] })
      }
    } catch (e) {
      showError('Sync gagal', e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      syncingRef.current = false
      setSyncing(false)
    }
  }, [profile?.id, showSuccess, showError, qc])

  // Auto-sync saat halaman pertama kali dibuka
  useEffect(() => { runSync() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Queries ──
  const { data: masukList = [], isLoading: loadMasuk } = useQuery({
    queryKey: ['surat_masuk'],
    queryFn: async () => {
      const { data, error } = await supabase.from('surat_masuk').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SuratMasuk[]
    },
  })

  const { data: keluarList = [], isLoading: loadKeluar } = useQuery({
    queryKey: ['surat_keluar'],
    queryFn: async () => {
      // Manual surat keluar always have nomor_agenda prefixed 'SK-' (from generateNomorAgenda).
      // Pajak sync docs never use this prefix. This is the only RLS-safe differentiator.
      const { data, error } = await supabase
        .from('surat_keluar')
        .select('*')
        .like('nomor_agenda', 'SK-%')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SuratKeluar[]
    },
  })

  const { data: pajakList = [], isLoading: loadPajak } = useQuery({
    queryKey: ['surat_pajak'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surat_keluar')
        .select('*')
        .eq('id_instansi', BPKPAD_ID)
        .not('nomor_agenda', 'like', 'SK-%')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as SuratKeluar[]
    },
  })

  // ── Mutations ──
  const saveMasukMut = useMutation({
    mutationFn: async ({ data, id }: { data: MasukForm; id?: string }) => {
      const nomor = id ? undefined : generateNomorAgenda('SM', new Date().getFullYear(), masukList.length + 1)
      const payload = { ...data, disposisi_kepada: data.disposisi_kepada || null, ...(nomor ? { nomor_agenda: nomor } : {}), ...(profile?.id ? { created_by: profile.id } : {}), ...(profile?.id_instansi ? { id_instansi: profile.id_instansi } : {}) }
      if (id) {
        const { data: updated, error } = await supabase.from('surat_masuk').update(payload).eq('id', id).select('id')
        if (error) throw error
        if (!updated?.length) throw new Error('Gagal menyimpan: akses ditolak database (RLS). Hubungi administrator.')
      } else { const { error } = await supabase.from('surat_masuk').insert(payload); if (error) throw error }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surat_masuk'] }); showSuccess('Berhasil', 'Surat masuk disimpan') },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const saveKeluarMut = useMutation({
    mutationFn: async ({ data, id }: { data: KeluarFormWithNomor; id?: string }) => {
      const { id_klasifikasi, nomor_surat, penandatangan, ...rest } = data
      const basePayload = {
        ...rest,
        nomor_surat,
        penandatangan: penandatangan || null,
        id_klasifikasi: id_klasifikasi || null,
        ...(profile?.id ? { created_by: profile.id } : {}),
        ...(profile?.id_instansi ? { id_instansi: profile.id_instansi } : {}),
        ...(id ? {} : { status: 'draft' as const }),
      }
      if (id) {
        const { data: updated, error } = await supabase.from('surat_keluar').update(basePayload).eq('id', id).select('id')
        if (error) throw error
        if (!updated?.length) throw new Error('Gagal menyimpan: akses ditolak database (RLS). Hubungi administrator.')
      } else {
        // Generate nomor_agenda with retry: if a sequence slot is taken (e.g. by a
        // record invisible to RLS), keep incrementing until an empty slot is found.
        const year = new Date().getFullYear()
        const prefix = `SK-${year}-`
        const { data: last } = await supabase
          .from('surat_keluar')
          .select('nomor_agenda')
          .like('nomor_agenda', `${prefix}%`)
          .order('nomor_agenda', { ascending: false })
          .limit(1)
        const lastSeq = last?.[0]?.nomor_agenda
          ? parseInt(last[0].nomor_agenda.replace(prefix, ''), 10)
          : 0
        let seq = (isNaN(lastSeq) ? 0 : lastSeq) + 1
        let inserted = false
        while (!inserted) {
          const nomor_agenda = `${prefix}${String(seq).padStart(4, '0')}`
          const { error } = await supabase.from('surat_keluar').insert({ ...basePayload, nomor_agenda })
          if (!error) { inserted = true; break }
          if (error.code === '23505') { seq++; continue } // duplicate → try next
          throw error
        }
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['surat_keluar'] }); showSuccess('Berhasil', 'Surat keluar disimpan') },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const deleteMut = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'masuk' | 'keluar' }) => {
      const table = type === 'masuk' ? 'surat_masuk' : 'surat_keluar'
      const { data: deleted, error } = await supabase.from(table).delete().eq('id', id).select('id')
      if (error) throw error
      if (!deleted?.length) throw new Error('Gagal menghapus: akses ditolak database (RLS). Hubungi administrator.')
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: [vars.type === 'masuk' ? 'surat_masuk' : 'surat_keluar'] }); showSuccess('Berhasil', 'Surat dihapus') },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const arsipkanMut = useMutation({
    mutationFn: async ({ surat, type }: { surat: SuratMasuk | SuratKeluar; type: 'masuk' | 'keluar' }) => {
      const { count } = await supabase.from('arsip').select('*', { count: 'exact', head: true })
      const nomor = generateNomorArsip(new Date().getFullYear(), (count ?? 0) + 1)
      let arsipPayload: Record<string, unknown>
      if (type === 'masuk') {
        const s = surat as SuratMasuk
        arsipPayload = {
          nomor_arsip: nomor, judul: s.perihal, nomor_surat: s.nomor_surat,
          tanggal_surat: s.tanggal_surat, pengirim: s.asal_surat,
          tingkat_keamanan: s.sifat === 'rahasia' ? 'rahasia' : 'biasa',
          media_simpan: 'fisik', status: 'aktif', jumlah: 1,
          id_instansi: s.id_instansi, created_by: profile?.id ?? null,
        }
      } else {
        const s = surat as SuratKeluar
        arsipPayload = {
          nomor_arsip: nomor, judul: s.perihal, nomor_surat: s.nomor_surat,
          tanggal_surat: s.tanggal_surat,
          tingkat_keamanan: s.sifat === 'rahasia' ? 'rahasia' : 'biasa',
          media_simpan: 'fisik', status: 'aktif', jumlah: 1,
          id_klasifikasi: (s as any).id_klasifikasi ?? null,
          id_instansi: s.id_instansi, created_by: profile?.id ?? null,
        }
      }
      const { data: newArsip, error: arsipErr } = await supabase.from('arsip').insert(arsipPayload).select('id').single()
      if (arsipErr) throw arsipErr
      const table = type === 'masuk' ? 'surat_masuk' : 'surat_keluar'
      const { error: updateErr } = await supabase.from(table).update({ status: 'diarsipkan', id_arsip: newArsip.id }).eq('id', surat.id)
      if (updateErr) throw updateErr
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: [vars.type === 'masuk' ? 'surat_masuk' : 'surat_keluar'] })
      showSuccess('Berhasil', 'Surat diarsipkan — lihat di menu Pemberkasan Arsip')
    },
    onError: (e) => showError('Gagal mengarsipkan', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  // ── Filtered ──
  const filteredMasuk = useMemo(() => {
    let r = masukList
    if (search) { const q = search.toLowerCase(); r = r.filter((s) => s.nomor_agenda.toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q) || s.asal_surat.toLowerCase().includes(q)) }
    if (filterSifat !== 'all') r = r.filter((s) => s.sifat === filterSifat)
    return r
  }, [masukList, search, filterSifat])

  const filteredKeluar = useMemo(() => {
    let r = keluarList
    if (search) { const q = search.toLowerCase(); r = r.filter((s) => s.nomor_agenda.toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q) || parseTujuanToTags(s.tujuan).join(' ').toLowerCase().includes(q)) }
    if (filterSifat !== 'all') r = r.filter((s) => s.sifat === filterSifat)
    return r
  }, [keluarList, search, filterSifat])

  const filteredPajak = useMemo(() => {
    if (!search) return pajakList
    const q = search.toLowerCase()
    return pajakList.filter((s) =>
      s.nomor_surat.toLowerCase().includes(q) ||
      s.perihal.toLowerCase().includes(q) ||
      s.tujuan.toLowerCase().includes(q)
    )
  }, [pajakList, search])

  const isLoading = tab === 'masuk' ? loadMasuk : tab === 'keluar' ? loadKeluar : loadPajak

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Buku Agenda Surat</h1>
            <p className="text-sm text-[#6e7977] mt-0.5">Pencatatan surat masuk dan surat keluar</p>
          </div>
          {tab !== 'pajak' && (
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => tab === 'masuk' ? setMasukModal(true) : setKeluarModal(true)}>
              {tab === 'masuk' ? 'Catat Surat Masuk' : 'Buat Surat Keluar'}
            </Button>
          )}
        </div>

        {/* Sync Bar — hanya tampil di tab Dokumen Pajak */}
        {tab === 'pajak' && (
          <SyncBar syncing={syncing} lastSummary={lastSummary} lastAt={lastAt} onSync={runSync} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Masuk',     value: masukList.length,  icon: <Inbox size={16} />, color: 'bg-[#dbeafe] text-[#2563eb]' },
            { label: 'Belum Diproses',  value: masukList.filter((s) => s.status === 'baru').length, icon: <Mail size={16} />, color: 'bg-[#fef3c7] text-[#d97706]' },
            { label: 'Surat Keluar',    value: keluarList.length, icon: <Send size={16} />, color: 'bg-[#dcfce7] text-[#16a34a]' },
            { label: 'Dok. Pajak',      value: pajakList.length,  icon: <FileSpreadsheet size={16} />, color: 'bg-[#f3e8ff] text-[#7c3aed]' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 24 }}>
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

        {/* Tabs + toolbar */}
        <Card padding="none" className="overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-[#e5e9e7] bg-[#f7faf8]">
            {([
              { key: 'masuk',  icon: <Inbox size={15} />,          label: 'Surat Masuk' },
              { key: 'keluar', icon: <Send size={15} />,           label: 'Surat Keluar' },
              { key: 'pajak',  icon: <FileSpreadsheet size={15} />, label: 'Dokumen Pajak' },
            ] as { key: 'masuk' | 'keluar' | 'pajak'; icon: React.ReactNode; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => { setTab(t.key); setSearch(''); setFilter('all') }}
                className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-colors ${tab === t.key ? 'text-[#0f766e]' : 'text-[#6e7977] hover:text-[#3e4947]'}`}
              >
                {t.icon}
                {t.label}
                {tab === t.key && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f766e] rounded-t-full" />}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-[#f1f4f3]">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'masuk'  ? 'Cari nomor, perihal, asal...'   :
                  tab === 'keluar' ? 'Cari nomor, perihal, tujuan...' :
                                     'Cari nomor, perihal, wajib pajak...'
                }
                className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-[#CBD5E1] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 bg-white transition-all"
              />
            </div>
            {tab !== 'pajak' && (
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-[#6e7977]" />
              {['all', 'biasa', 'penting', 'rahasia', 'sangat_segera'].map((val) => {
                const labels: Record<string, string> = { all: 'Semua', biasa: 'Biasa', penting: 'Penting', rahasia: 'Rahasia', sangat_segera: 'Segera' }
                return <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${filterSifat === val ? 'bg-[#0f766e] text-white' : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'}`}>{labels[val]}</button>
              })}
            </div>
            )}
          </div>

          {/* Table */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, x: tab === 'masuk' ? -10 : 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e5e9e7] bg-[#f7faf8]">
                      {tab === 'masuk' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">No. Agenda</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Asal / Perihal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Terima</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Sifat</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-32">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-32">Aksi</th>
                        </>
                      ) : tab === 'keluar' ? (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">No. Agenda</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Tujuan / Perihal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Sifat</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">Status</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-32">Aksi</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-48">Nomor Dokumen</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Wajib Pajak / Perihal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">Jenis</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-[#f1f4f3]">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 rounded-md bg-[#f1f4f3] animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} /></td>
                        ))}
                      </tr>
                    )) : tab === 'masuk' ? (
                      filteredMasuk.length === 0 ? (
                        <tr><td colSpan={6}>
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#dbeafe] flex items-center justify-center mb-3">
                              <Inbox size={24} className="text-[#2563eb]" />
                            </div>
                            <p className="text-sm font-semibold text-[#181c1c] mb-1">
                              {search || filterSifat !== 'all' ? 'Tidak ada hasil pencarian' : 'Belum ada surat masuk'}
                            </p>
                            <p className="text-xs text-[#6e7977] mb-4">
                              {search || filterSifat !== 'all'
                                ? 'Coba ubah kata kunci atau filter pencarian'
                                : 'Klik "Catat Surat Masuk" untuk mencatat surat pertama'}
                            </p>
                            {!search && filterSifat === 'all' && (
                              <button onClick={() => setMasukModal(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563eb] hover:underline">
                                <Plus size={13} /> Catat Surat Masuk
                              </button>
                            )}
                          </div>
                        </td></tr>
                      ) : filteredMasuk.map((item, i) => (
                        <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-[#f1f4f3] hover:bg-[#f7faf8] transition-colors group">
                          <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-[#2563eb]">{item.nomor_agenda}</span></td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#181c1c] line-clamp-1">{item.perihal}</p>
                            <p className="text-xs text-[#6e7977]">{item.asal_surat}</p>
                            {item.disposisi_kepada && <p className="text-xs text-[#0f766e]">→ {item.disposisi_kepada}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#3e4947]">{formatDate(item.tanggal_terima)}</td>
                          <td className="px-4 py-3">{sifatBadge(item.sifat)}</td>
                          <td className="px-4 py-3">{masukStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.id_arsip
                                ? <button onClick={() => navigate('/arsip')} className="p-1.5 rounded-lg bg-[#f0fdfa] text-[#0f766e]" title="Lihat Arsip"><FolderOpen size={14} /></button>
                                : <button onClick={() => arsipkanMut.mutate({ surat: item, type: 'masuk' })} disabled={arsipkanMut.isPending} className="p-1.5 rounded-lg hover:bg-[#f0fdfa] text-[#6e7977] hover:text-[#0f766e] disabled:opacity-40" title="Arsipkan"><Archive size={14} /></button>
                              }
                              <button onClick={() => { setEditMasuk(item); setMasukModal(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setDeleting({ id: item.id, label: `${item.nomor_agenda} — ${item.perihal}`, type: 'masuk' })} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]" title="Hapus"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : tab === 'keluar' ? (
                      filteredKeluar.length === 0 ? (
                        <tr><td colSpan={6}>
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#dcfce7] flex items-center justify-center mb-3">
                              <Send size={24} className="text-[#16a34a]" />
                            </div>
                            <p className="text-sm font-semibold text-[#181c1c] mb-1">
                              {search || filterSifat !== 'all' ? 'Tidak ada hasil pencarian' : 'Belum ada surat keluar'}
                            </p>
                            <p className="text-xs text-[#6e7977] mb-4">
                              {search || filterSifat !== 'all'
                                ? 'Coba ubah kata kunci atau filter pencarian'
                                : 'Klik "Buat Surat Keluar" untuk membuat surat pertama dengan nomor otomatis'}
                            </p>
                            {!search && filterSifat === 'all' && (
                              <button onClick={() => setKeluarModal(true)} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#16a34a] hover:underline">
                                <Plus size={13} /> Buat Surat Keluar
                              </button>
                            )}
                          </div>
                        </td></tr>
                      ) : filteredKeluar.map((item, i) => (
                        <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-[#f1f4f3] hover:bg-[#f7faf8] transition-colors group">
                          <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-[#16a34a]">{item.nomor_surat}</span></td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#181c1c] line-clamp-1">{item.perihal}</p>
                            <div className="flex flex-wrap gap-0.5 mt-0.5">
                              {parseTujuanToTags(item.tujuan).map((t, ti) => (
                                <span key={ti} className="inline-flex items-center text-[10px] font-semibold text-[#15803d] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                            {item.penandatangan && <p className="text-xs text-[#0f766e] mt-0.5">TTD: {item.penandatangan}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#3e4947]">{formatDate(item.tanggal_surat)}</td>
                          <td className="px-4 py-3">{sifatBadge(item.sifat)}</td>
                          <td className="px-4 py-3">{keluarStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {item.id_arsip
                                ? <button onClick={() => navigate('/arsip')} className="p-1.5 rounded-lg bg-[#f0fdfa] text-[#0f766e]" title="Lihat Arsip"><FolderOpen size={14} /></button>
                                : <button onClick={() => arsipkanMut.mutate({ surat: item, type: 'keluar' })} disabled={arsipkanMut.isPending} className="p-1.5 rounded-lg hover:bg-[#f0fdfa] text-[#6e7977] hover:text-[#0f766e] disabled:opacity-40" title="Arsipkan"><Archive size={14} /></button>
                              }
                              <button onClick={() => { setEditKeluar(item); setKeluarModal(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setDeleting({ id: item.id, label: `${item.nomor_agenda} — ${item.perihal}`, type: 'keluar' })} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]" title="Hapus"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
                      /* ── Tab Dokumen Pajak ── */
                      filteredPajak.length === 0 ? (
                        <tr><td colSpan={4}>
                          <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-[#f3e8ff] flex items-center justify-center mb-3">
                              <FileSpreadsheet size={24} className="text-[#7c3aed]" />
                            </div>
                            <p className="text-sm font-semibold text-[#181c1c] mb-1">
                              {search ? 'Tidak ada hasil pencarian' : 'Belum ada dokumen pajak'}
                            </p>
                            <p className="text-xs text-[#6e7977] mb-4">
                              {search ? 'Coba ubah kata kunci pencarian' : 'Klik "Sync Sekarang" untuk mengambil data dari sistem BPKPAD'}
                            </p>
                          </div>
                        </td></tr>
                      ) : filteredPajak.map((item, i) => {
                        const jenis = item.perihal.split(' ')[0]
                        const jenisColor: Record<string, string> = {
                          SKPD: 'bg-[#dbeafe] text-[#1d4ed8]',
                          SKRD: 'bg-[#dcfce7] text-[#15803d]',
                          SSPD: 'bg-[#fef3c7] text-[#b45309]',
                          SSRD: 'bg-[#f3e8ff] text-[#7c3aed]',
                        }
                        return (
                          <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="border-b border-[#f1f4f3] hover:bg-[#faf8ff] transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-xs font-mono font-bold text-[#7c3aed]">{item.nomor_surat}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-[#181c1c] line-clamp-1">{item.perihal}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 size={11} className="text-[#6e7977]" />
                                <p className="text-xs text-[#6e7977]">{item.tujuan}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#3e4947]">{formatDate(item.tanggal_surat)}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${jenisColor[jenis] ?? 'bg-[#f1f4f3] text-[#6e7977]'}`}>
                                {jenis}
                              </span>
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="px-4 py-3 border-t border-[#f1f4f3] bg-[#f7faf8]">
            <p className="text-xs text-[#6e7977]">
              {tab === 'masuk'
                ? <span>Menampilkan <span className="font-semibold text-[#181c1c]">{filteredMasuk.length}</span> dari <span className="font-semibold text-[#181c1c]">{masukList.length}</span> surat masuk</span>
                : tab === 'keluar'
                ? <span>Menampilkan <span className="font-semibold text-[#181c1c]">{filteredKeluar.length}</span> dari <span className="font-semibold text-[#181c1c]">{keluarList.length}</span> surat keluar</span>
                : <span>Menampilkan <span className="font-semibold text-[#181c1c]">{filteredPajak.length}</span> dari <span className="font-semibold text-[#181c1c]">{pajakList.length}</span> dokumen pajak (BPKPAD)</span>
              }
            </p>
          </div>
        </Card>
      </motion.div>

      <MasukModal open={masukModal} onClose={() => { setMasukModal(false); setEditMasuk(null) }} editing={editMasuk} onSave={async (d) => { await saveMasukMut.mutateAsync({ data: d, id: editMasuk?.id }) }} />
      <KeluarModal open={keluarModal} onClose={() => { setKeluarModal(false); setEditKeluar(null) }} editing={editKeluar} onSave={async (d) => { await saveKeluarMut.mutateAsync({ data: d, id: editKeluar?.id }) }} />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} label={deleting?.label ?? ''} onConfirm={async () => { if (deleting) await deleteMut.mutateAsync({ id: deleting.id, type: deleting.type }) }} />
    </>
  )
}
