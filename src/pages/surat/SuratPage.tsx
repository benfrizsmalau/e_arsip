import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Edit2, Trash2, X,
  Mail, Send, AlertTriangle, FileText, Inbox,
  CheckCircle2, Clock, Archive, Zap, Hash, BookOpen, Sparkles, PenLine,
  RefreshCw
} from 'lucide-react'
import { syncAllPajak, getLastSyncAt, type SyncSummary } from '@/lib/syncPajak'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, generateNomorAgenda } from '@/lib/utils'
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sifatBadge = (sifat: string) => {
  const map: Record<string, { v: 'neutral' | 'warning' | 'error' | 'purple'; l: string }> = {
    biasa:         { v: 'neutral', l: 'Biasa' },
    penting:       { v: 'warning', l: 'Penting' },
    rahasia:       { v: 'error',   l: 'Rahasia' },
    sangat_segera: { v: 'purple',  l: 'Sangat Segera' },
  }
  const { v, l } = map[sifat] ?? { v: 'neutral', l: sifat }
  return <Badge variant={v} size="sm">{l}</Badge>
}

const masukStatusBadge = (s: string) => {
  const map: Record<string, { v: 'info' | 'warning' | 'success' | 'neutral'; l: string; icon: React.ReactNode }> = {
    baru:        { v: 'info',    l: 'Baru',       icon: <Inbox size={11} /> },
    diproses:    { v: 'warning', l: 'Diproses',   icon: <Clock size={11} /> },
    selesai:     { v: 'success', l: 'Selesai',    icon: <CheckCircle2 size={11} /> },
    diarsipkan:  { v: 'neutral', l: 'Diarsipkan', icon: <Archive size={11} /> },
  }
  const { v, l, icon } = map[s] ?? { v: 'neutral', l: s, icon: null }
  return <Badge variant={v} size="sm">{icon} {l}</Badge>
}

const keluarStatusBadge = (s: string) => {
  const map: Record<string, { v: 'neutral' | 'warning' | 'success' | 'info'; l: string; icon: React.ReactNode }> = {
    draft:        { v: 'neutral', l: 'Draft',         icon: <FileText size={11} /> },
    menunggu_ttd: { v: 'warning', l: 'Menunggu TTD',  icon: <Clock size={11} /> },
    terkirim:     { v: 'success', l: 'Terkirim',      icon: <Send size={11} /> },
    diarsipkan:   { v: 'info',    l: 'Diarsipkan',    icon: <Archive size={11} /> },
  }
  const { v, l, icon } = map[s] ?? { v: 'neutral', l: s, icon: null }
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

// ─── Surat Keluar Modal ───────────────────────────────────────────────────────
function KeluarModal({ open, onClose, editing, onSave }: {
  open: boolean; onClose: () => void; editing: SuratKeluar | null
  onSave: (d: KeluarFormWithNomor) => Promise<void>
}) {
  const { profile } = useAuthStore()
  const { error: showError } = useToast()
  const [nomorMode, setNomorMode]           = useState<NomorMode>('otomatis')
  const [klasifikasiList, setKlasifikasiList] = useState<{ id: string; kode: string; nama: string }[]>([])
  const [previewNomor, setPreviewNomor]       = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview]   = useState(false)

  const { register, handleSubmit, reset, watch, setError, formState: { errors, isSubmitting } } = useForm<KeluarForm>({
    resolver: zodResolver(keluarSchema),
    defaultValues: editing
      ? { tujuan: editing.tujuan, id_klasifikasi: (editing as any).id_klasifikasi ?? '', tanggal_surat: editing.tanggal_surat, perihal: editing.perihal, sifat: editing.sifat, penandatangan: editing.penandatangan ?? '', nomor_surat_manual: editing.nomor_surat ?? '' }
      : { sifat: 'biasa', tanggal_surat: new Date().toISOString().slice(0, 10) },
  })

  const watchedKlas = watch('id_klasifikasi')

  // Load klasifikasi list once
  useEffect(() => {
    supabase.from('klasifikasi').select('id, kode, nama').order('kode')
      .then(({ data }) => { if (data?.length) setKlasifikasiList(data) })
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

    await onSave({ ...d, nomor_surat })
    reset()
    setPreviewNomor(null)
    setNomorMode('otomatis')
    onClose()
  }

  // Group klasifikasi by hundreds for optgroup
  const grouped = useMemo(() => {
    const groups: Record<string, { id: string; kode: string; nama: string }[]> = {}
    const labels: Record<string, string> = {
      '0': 'Umum (000)', '1': 'Pemerintahan (100)', '2': 'Politik (200)',
      '3': 'Keamanan (300)', '4': 'Kesejahteraan (400)', '5': 'Perekonomian (500)',
      '6': 'Pekerjaan Umum (600)', '7': 'Pengawasan (700)',
      '8': 'Kepegawaian (800)', '9': 'Keuangan (900)',
    }
    klasifikasiList.forEach(k => {
      const g = k.kode.charAt(0)
      if (!groups[g]) groups[g] = []
      groups[g].push(k)
    })
    return Object.entries(groups).map(([g, items]) => ({ label: labels[g] ?? g + 'xx', items }))
  }, [klasifikasiList])

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
                  {/* Klasifikasi */}
                  {!editing && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                        Klasifikasi Surat <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <div className="relative">
                        <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
                        <select
                          className="w-full rounded-[10px] border border-[#CBD5E1] bg-white pl-8 pr-4 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all appearance-none"
                          {...register('id_klasifikasi')}
                        >
                          <option value="">— Pilih Klasifikasi —</option>
                          {grouped.map(g => (
                            <optgroup key={g.label} label={g.label}>
                              {g.items.map(k => (
                                <option key={k.id} value={k.id}>{k.kode} — {k.nama}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {errors.id_klasifikasi && <p className="text-xs text-[#ba1a1a]">⚠ {errors.id_klasifikasi.message}</p>}
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
                        placeholder="Contoh: 005/BPKAD/V/2026"
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

              <Input label="Tujuan" placeholder="Nama instansi atau pejabat tujuan" required error={errors.tujuan?.message} {...register('tujuan')} />
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

  const [tab, setTab]           = useState<'masuk' | 'keluar'>('masuk')
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
      const { data, error } = await supabase.from('surat_keluar').select('*').order('created_at', { ascending: false })
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
      const nomor_agenda = id ? undefined : generateNomorAgenda('SK', new Date().getFullYear(), keluarList.length + 1)
      const { id_klasifikasi, nomor_surat, penandatangan, ...rest } = data
      const payload = {
        ...rest,
        nomor_surat,
        penandatangan: penandatangan || null,
        id_klasifikasi: id_klasifikasi || null,
        ...(nomor_agenda ? { nomor_agenda } : {}),
        ...(profile?.id ? { created_by: profile.id } : {}),
        ...(profile?.id_instansi ? { id_instansi: profile.id_instansi } : {}),
        ...(id ? {} : { status: 'draft' as const }),
      }
      if (id) {
        const { data: updated, error } = await supabase.from('surat_keluar').update(payload).eq('id', id).select('id')
        if (error) throw error
        if (!updated?.length) throw new Error('Gagal menyimpan: akses ditolak database (RLS). Hubungi administrator.')
      } else { const { error } = await supabase.from('surat_keluar').insert(payload); if (error) throw error }
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

  // ── Filtered ──
  const filteredMasuk = useMemo(() => {
    let r = masukList
    if (search) { const q = search.toLowerCase(); r = r.filter((s) => s.nomor_agenda.toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q) || s.asal_surat.toLowerCase().includes(q)) }
    if (filterSifat !== 'all') r = r.filter((s) => s.sifat === filterSifat)
    return r
  }, [masukList, search, filterSifat])

  const filteredKeluar = useMemo(() => {
    let r = keluarList
    if (search) { const q = search.toLowerCase(); r = r.filter((s) => s.nomor_agenda.toLowerCase().includes(q) || s.perihal.toLowerCase().includes(q) || s.tujuan.toLowerCase().includes(q)) }
    if (filterSifat !== 'all') r = r.filter((s) => s.sifat === filterSifat)
    return r
  }, [keluarList, search, filterSifat])

  const isLoading = tab === 'masuk' ? loadMasuk : loadKeluar

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Buku Agenda Surat</h1>
            <p className="text-sm text-[#6e7977] mt-0.5">Pencatatan surat masuk dan surat keluar</p>
          </div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => tab === 'masuk' ? setMasukModal(true) : setKeluarModal(true)}>
            {tab === 'masuk' ? 'Catat Surat Masuk' : 'Buat Surat Keluar'}
          </Button>
        </div>

        {/* Sync Bar */}
        <SyncBar syncing={syncing} lastSummary={lastSummary} lastAt={lastAt} onSync={runSync} />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Masuk',  value: masukList.length,  icon: <Inbox size={16} />, color: 'bg-[#dbeafe] text-[#2563eb]' },
            { label: 'Belum Diproses', value: masukList.filter((s) => s.status === 'baru').length, icon: <Mail size={16} />, color: 'bg-[#fef3c7] text-[#d97706]' },
            { label: 'Total Keluar', value: keluarList.length, icon: <Send size={16} />, color: 'bg-[#dcfce7] text-[#16a34a]' },
            { label: 'Terkirim',     value: keluarList.filter((s) => s.status === 'terkirim').length, icon: <Zap size={16} />, color: 'bg-[#ccfbf1] text-[#0f766e]' },
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
            {(['masuk', 'keluar'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSearch(''); setFilter('all') }}
                className={`relative flex items-center gap-2 px-6 py-3.5 text-sm font-semibold transition-colors ${tab === t ? 'text-[#0f766e]' : 'text-[#6e7977] hover:text-[#3e4947]'}`}
              >
                {t === 'masuk' ? <Inbox size={15} /> : <Send size={15} />}
                Surat {t === 'masuk' ? 'Masuk' : 'Keluar'}
                {tab === t && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0f766e] rounded-t-full" />}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-[#f1f4f3]">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'masuk' ? 'Cari nomor, perihal, asal...' : 'Cari nomor, perihal, tujuan...'} className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-[#CBD5E1] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 bg-white transition-all" />
            </div>
            <div className="flex items-center gap-1.5">
              <Filter size={13} className="text-[#6e7977]" />
              {['all', 'biasa', 'penting', 'rahasia', 'sangat_segera'].map((val) => {
                const labels: Record<string, string> = { all: 'Semua', biasa: 'Biasa', penting: 'Penting', rahasia: 'Rahasia', sangat_segera: 'Segera' }
                return <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${filterSifat === val ? 'bg-[#0f766e] text-white' : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'}`}>{labels[val]}</button>
              })}
            </div>
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
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">No. Agenda</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Tujuan / Perihal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Sifat</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">Status</th>
                        </>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-24">Aksi</th>
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
                              <button onClick={() => { setEditMasuk(item); setMasukModal(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setDeleting({ id: item.id, label: `${item.nomor_agenda} — ${item.perihal}`, type: 'masuk' })} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]" title="Hapus"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    ) : (
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
                          <td className="px-4 py-3"><span className="text-xs font-mono font-bold text-[#16a34a]">{item.nomor_agenda}</span></td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[#181c1c] line-clamp-1">{item.perihal}</p>
                            <p className="text-xs text-[#6e7977]">{item.tujuan}</p>
                            {item.penandatangan && <p className="text-xs text-[#0f766e]">TTD: {item.penandatangan}</p>}
                          </td>
                          <td className="px-4 py-3 text-xs text-[#3e4947]">{formatDate(item.tanggal_surat)}</td>
                          <td className="px-4 py-3">{sifatBadge(item.sifat)}</td>
                          <td className="px-4 py-3">{keluarStatusBadge(item.status)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditKeluar(item); setKeluarModal(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]" title="Edit"><Edit2 size={14} /></button>
                              <button onClick={() => setDeleting({ id: item.id, label: `${item.nomor_agenda} — ${item.perihal}`, type: 'keluar' })} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]" title="Hapus"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
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
                : <span>Menampilkan <span className="font-semibold text-[#181c1c]">{filteredKeluar.length}</span> dari <span className="font-semibold text-[#181c1c]">{keluarList.length}</span> surat keluar</span>
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
