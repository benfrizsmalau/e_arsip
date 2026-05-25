import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Eye, Edit2, Trash2,
  X, FileText, Upload, CheckCircle2, AlertTriangle,
  Lock, Shield, ShieldAlert, ShieldOff,
  Archive, Clock, Zap, Star, LayoutGrid, List,
  FileUp, File, ImageIcon, Loader2, ExternalLink
} from 'lucide-react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { fetchAllKlasifikasi } from '@/lib/klasifikasi'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useToast } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import {
  formatDate, formatFileSize, getStatusArsipColor,
  getTingkatKeamananLabel, generateNomorArsip
} from '@/lib/utils'
import type { Arsip, JRA, Klasifikasi } from '@/types/database'

// ─── Types ────────────────────────────────────────────────────────────────────
type ArsipWithRel = Arsip & {
  klasifikasi?: Pick<Klasifikasi, 'kode' | 'nama'> | null
  jra?: Pick<JRA, 'kode' | 'judul' | 'retensi_aktif' | 'retensi_inaktif' | 'nasib_akhir'> | null
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const arsipSchema = z.object({
  judul:                z.string().min(3, 'Judul minimal 3 karakter'),
  perihal:              z.string().optional(),
  id_klasifikasi:       z.string().optional(),
  id_jra:               z.string().optional(),
  nomor_surat:          z.string().optional(),
  tanggal_surat:        z.string().optional(),
  pengirim:             z.string().optional(),
  tingkat_keamanan:     z.enum(['biasa', 'terbatas', 'rahasia', 'sangat_rahasia']),
  media_simpan:         z.enum(['digital', 'fisik', 'keduanya']),
  tingkat_perkembangan: z.enum(['asli', 'fotokopi', 'tembusan']).optional(),
  kurun_waktu_mulai:    z.string().optional(),
  kurun_waktu_selesai:  z.string().optional(),
  jumlah:               z.coerce.number().min(1).default(1),
  keterangan:           z.string().optional(),
  status:               z.enum(['aktif', 'inaktif', 'vital', 'permanen', 'musnah', 'draft']),
})
type ArsipFormData = z.infer<typeof arsipSchema>

// ─── Security icons ───────────────────────────────────────────────────────────
const keamananIcon: Record<string, React.ReactNode> = {
  biasa:          <ShieldOff size={13} />,
  terbatas:       <Shield size={13} />,
  rahasia:        <ShieldAlert size={13} />,
  sangat_rahasia: <Lock size={13} />,
}

const statusIcon: Record<string, React.ReactNode> = {
  aktif:    <Archive size={12} />,
  inaktif:  <Clock size={12} />,
  vital:    <Star size={12} />,
  permanen: <CheckCircle2 size={12} />,
  musnah:   <Trash2 size={12} />,
  draft:    <FileText size={12} />,
}

const statusLabelsMap: Record<string, string> = {
  aktif: 'Aktif', inaktif: 'Inaktif', vital: 'Vital',
  permanen: 'Permanen', musnah: 'Musnah', draft: 'Draft',
}

// ─── File Drop Zone ───────────────────────────────────────────────────────────
function FileDropZone({ file, onChange, uploading, progress }: {
  file: File | null
  onChange: (f: File | null) => void
  uploading: boolean
  progress: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onChange(f)
  }, [onChange])

  return (
    <div>
      <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider mb-1.5">
        File Arsip (opsional)
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
          dragging ? 'border-[#0f766e] bg-[#f0fdf9]' :
          file     ? 'border-[#99f6e4] bg-[#f0fdf9] cursor-default' :
                     'border-[#CBD5E1] hover:border-[#0f766e] hover:bg-[#fafcfb]'
        }`}
      >
        <input ref={inputRef} type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        {file ? (
          <div className="p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#ccfbf1] flex items-center justify-center flex-shrink-0">
              {file.type.includes('image') ? <ImageIcon size={18} className="text-[#0f766e]" /> : <File size={18} className="text-[#0f766e]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#181c1c] truncate">{file.name}</p>
              <p className="text-xs text-[#6e7977]">{formatFileSize(file.size)}</p>
              {uploading && (
                <div className="mt-2">
                  <div className="h-1.5 rounded-full bg-[#e5e9e7] overflow-hidden">
                    <motion.div className="h-full bg-[#0f766e] rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-[#0f766e] mt-1">{progress}% diunggah...</p>
                </div>
              )}
            </div>
            {!uploading && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onChange(null) }} className="p-1 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a] transition-colors">
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-xl bg-[#f1f4f3] flex items-center justify-center mb-3">
              <FileUp size={20} className="text-[#6e7977]" />
            </div>
            <p className="text-sm font-medium text-[#3e4947]">Seret & lepas file di sini, atau <span className="text-[#0f766e]">klik untuk pilih</span></p>
            <p className="text-xs text-[#6e7977] mt-1">PDF, DOC, XLS, PNG, JPG — maks. 10 MB</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Arsip Form Modal ─────────────────────────────────────────────────────────
function ArsipModal({ open, onClose, editing, klasifikasiList, jraList, onSave }: {
  open: boolean
  onClose: () => void
  editing: ArsipWithRel | null
  klasifikasiList: Klasifikasi[]
  jraList: JRA[]
  onSave: (data: ArsipFormData, file: File | null) => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress] = useState(0)

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<ArsipFormData>({
    resolver: zodResolver(arsipSchema) as Resolver<ArsipFormData>,
    defaultValues: editing ? {
      judul: editing.judul, perihal: editing.perihal ?? '', id_klasifikasi: editing.id_klasifikasi ?? '',
      id_jra: editing.id_jra ?? '', nomor_surat: editing.nomor_surat ?? '', tanggal_surat: editing.tanggal_surat ?? '',
      pengirim: editing.pengirim ?? '', tingkat_keamanan: editing.tingkat_keamanan, media_simpan: editing.media_simpan,
      tingkat_perkembangan: editing.tingkat_perkembangan ?? undefined, kurun_waktu_mulai: editing.kurun_waktu_mulai ?? '',
      kurun_waktu_selesai: editing.kurun_waktu_selesai ?? '', jumlah: editing.jumlah, keterangan: editing.keterangan ?? '', status: editing.status,
    } : { tingkat_keamanan: 'biasa', media_simpan: 'digital', status: 'aktif', jumlah: 1 },
  })

  async function submit(data: ArsipFormData) {
    if (file) setUploading(true)
    await onSave(data, file)
    setUploading(false)
    setFile(null)
    reset()
    onClose()
  }

  const divider = (label: string) => (
    <div className="flex items-center gap-2 my-1">
      <div className="h-px flex-1 bg-[#e5e9e7]" />
      <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider px-2">{label}</span>
      <div className="h-px flex-1 bg-[#e5e9e7]" />
    </div>
  )

  const selectClass = "w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all"

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 260, damping: 26 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto z-10">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-[#e5e9e7] bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ccfbf1] flex items-center justify-center">
                  <Archive size={16} className="text-[#0f766e]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{editing ? 'Edit Arsip' : 'Pemberkasan Arsip Baru'}</h3>
                  <p className="text-xs text-[#6e7977]">Isi metadata arsip dengan lengkap</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]"><X size={16} /></button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="p-6 space-y-4">
              {divider('Identitas Arsip')}
              <Input label="Judul Arsip" placeholder="Nama/judul dokumen arsip" required error={errors.judul?.message} {...register('judul')} />
              <Input label="Perihal" placeholder="Ringkasan isi dokumen" {...register('perihal')} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Klasifikasi</label>
                  <select className={selectClass} {...register('id_klasifikasi')}>
                    <option value="">— Pilih —</option>
                    {klasifikasiList.map((k) => <option key={k.id} value={k.id}>{k.kode} - {k.nama}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Jadwal Retensi</label>
                  <select className={selectClass} {...register('id_jra')}>
                    <option value="">— Pilih —</option>
                    {jraList.map((j) => <option key={j.id} value={j.id}>{j.kode} - {j.judul}</option>)}
                  </select>
                </div>
              </div>

              {divider('Keterangan Surat')}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nomor Surat" placeholder="001/UM/2024" {...register('nomor_surat')} />
                <Input label="Tanggal Surat" type="date" {...register('tanggal_surat')} />
              </div>
              <Input label="Pengirim / Asal Dokumen" placeholder="Instansi atau nama pengirim" {...register('pengirim')} />

              {divider('Sifat & Media')}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Tingkat Keamanan <span className="text-[#ba1a1a]">*</span></label>
                <Controller name="tingkat_keamanan" control={control} render={({ field }) => (
                  <div className="grid grid-cols-4 gap-2">
                    {(['biasa', 'terbatas', 'rahasia', 'sangat_rahasia'] as const).map((val) => {
                      const labels = { biasa: 'Biasa', terbatas: 'Terbatas', rahasia: 'Rahasia', sangat_rahasia: 'Sangat Rahasia' }
                      const colors = { biasa: 'peer-checked:border-[#6e7977] peer-checked:bg-[#f1f4f3] peer-checked:text-[#3e4947]', terbatas: 'peer-checked:border-[#2563eb] peer-checked:bg-[#dbeafe] peer-checked:text-[#1e40af]', rahasia: 'peer-checked:border-[#d97706] peer-checked:bg-[#fef3c7] peer-checked:text-[#92400e]', sangat_rahasia: 'peer-checked:border-[#ba1a1a] peer-checked:bg-[#ffdad6] peer-checked:text-[#93000a]' }
                      return (
                        <label key={val} className="relative cursor-pointer">
                          <input type="radio" value={val} checked={field.value === val} onChange={() => field.onChange(val)} className="sr-only peer" />
                          <div className={`rounded-[10px] border-2 border-[#e5e9e7] px-2 py-2 text-center text-xs font-semibold text-[#6e7977] transition-all select-none ${colors[val]}`}>{labels[val]}</div>
                        </label>
                      )
                    })}
                  </div>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Media Simpan <span className="text-[#ba1a1a]">*</span></label>
                  <select className={selectClass} {...register('media_simpan')}>
                    <option value="digital">Digital</option>
                    <option value="fisik">Fisik</option>
                    <option value="keduanya">Keduanya</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Tingkat Perkembangan</label>
                  <select className={selectClass} {...register('tingkat_perkembangan')}>
                    <option value="">— Pilih —</option>
                    <option value="asli">Asli</option>
                    <option value="fotokopi">Fotokopi</option>
                    <option value="tembusan">Tembusan</option>
                  </select>
                </div>
              </div>

              {divider('Kurun Waktu & Status')}
              <div className="grid grid-cols-2 gap-4">
                <Input label="Kurun Waktu Mulai" type="date" {...register('kurun_waktu_mulai')} />
                <Input label="Kurun Waktu Selesai" type="date" {...register('kurun_waktu_selesai')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Jumlah Berkas" type="number" min={1} error={errors.jumlah?.message} {...register('jumlah')} />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Status <span className="text-[#ba1a1a]">*</span></label>
                  <select className={selectClass} {...register('status')}>
                    <option value="aktif">Aktif</option>
                    <option value="inaktif">Inaktif</option>
                    <option value="vital">Vital</option>
                    <option value="permanen">Permanen</option>
                    <option value="draft">Draft</option>
                    <option value="musnah">Musnah</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">Keterangan</label>
                <textarea rows={2} placeholder="Catatan tambahan..." className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all resize-none" {...register('keterangan')} />
              </div>

              {divider('File Digital')}
              <FileDropZone file={file} onChange={setFile} uploading={uploading} progress={progress} />

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting || uploading} leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : undefined}>
                  {editing ? 'Simpan Perubahan' : 'Berkas Arsip'}
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
function DeleteConfirm({ open, onClose, onConfirm, item }: { open: boolean; onClose: () => void; onConfirm: () => Promise<void>; item: ArsipWithRel | null }) {
  const [loading, setLoading] = useState(false)
  async function go() { setLoading(true); await onConfirm(); setLoading(false); onClose() }
  return (
    <AnimatePresence>
      {open && item && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 z-10">
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4"><AlertTriangle size={22} className="text-[#ba1a1a]" /></div>
              <h3 className="text-base font-bold text-[#181c1c] mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Hapus Arsip?</h3>
              <p className="text-sm text-[#6e7977] mb-1"><span className="font-semibold text-[#181c1c]">{item.nomor_arsip}</span></p>
              <p className="text-xs text-[#181c1c] mb-1 line-clamp-2">{item.judul}</p>
              <p className="text-xs text-[#ba1a1a] mb-6">File digital juga akan dihapus secara permanen.</p>
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ item, onClose, onEdit }: { item: ArsipWithRel | null; onClose: () => void; onEdit: () => void }) {
  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 280, damping: 30 }} className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Detail Arsip</h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="icon-sm" onClick={onEdit}><Edit2 size={13} /></Button>
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]"><X size={16} /></button>
                </div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-[#005c55] to-[#0f766e] p-4 text-white">
                <p className="text-xs font-semibold opacity-70 mb-1">Nomor Arsip</p>
                <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>{item.nomor_arsip}</p>
                <p className="text-sm mt-2 opacity-90 leading-snug">{item.judul}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={getStatusArsipColor(item.status) as never} size="sm">{statusIcon[item.status]} {statusLabelsMap[item.status]}</Badge>
                <Badge variant={getTingkatKeamananLabel(item.tingkat_keamanan).color as never} size="sm">{keamananIcon[item.tingkat_keamanan]} {getTingkatKeamananLabel(item.tingkat_keamanan).label}</Badge>
              </div>
              {[
                { label: 'Nomor Surat',   value: item.nomor_surat },
                { label: 'Tanggal Surat', value: item.tanggal_surat ? formatDate(item.tanggal_surat, 'long') : null },
                { label: 'Pengirim',      value: item.pengirim },
                { label: 'Klasifikasi',   value: item.klasifikasi ? `${item.klasifikasi.kode} — ${item.klasifikasi.nama}` : null },
                { label: 'JRA',           value: item.jra ? `${item.jra.kode} — ${item.jra.judul}` : null },
                { label: 'Media',         value: item.media_simpan },
                { label: 'Perkembangan',  value: item.tingkat_perkembangan },
                { label: 'Jumlah Berkas', value: `${item.jumlah} berkas` },
                { label: 'Kurun Waktu',   value: item.kurun_waktu_mulai ? `${formatDate(item.kurun_waktu_mulai)} – ${item.kurun_waktu_selesai ? formatDate(item.kurun_waktu_selesai) : 'sekarang'}` : null },
                { label: 'Keterangan',    value: item.keterangan },
              ].filter((r) => r.value).map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#f1f4f3]">
                  <span className="text-xs font-semibold text-[#6e7977] uppercase tracking-wider shrink-0">{row.label}</span>
                  <p className="text-sm text-[#181c1c] text-right">{row.value}</p>
                </div>
              ))}
              {/* JRA Retensi Info */}
              {item.jra && (
                <div className="rounded-xl bg-[#fefce8] border border-[#fde68a] p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-[#d97706]" />
                      <span className="text-xs font-bold text-[#d97706] uppercase tracking-wide">Jadwal Retensi</span>
                    </div>
                    <Link
                      to="/jra"
                      className="flex items-center gap-1 text-xs text-[#d97706] hover:underline font-medium"
                    >
                      Buka JRA <ExternalLink size={10} />
                    </Link>
                  </div>
                  <p className="text-xs font-mono font-semibold text-[#181c1c]">{item.jra.kode} — {item.jra.judul}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-[#6e7977] uppercase tracking-wide">Aktif</p>
                      <p className="text-sm font-bold text-[#181c1c]">
                        {item.jra.retensi_aktif != null ? `${item.jra.retensi_aktif} thn` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e7977] uppercase tracking-wide">Inaktif</p>
                      <p className="text-sm font-bold text-[#181c1c]">
                        {item.jra.retensi_inaktif != null ? `${item.jra.retensi_inaktif} thn` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e7977] uppercase tracking-wide">Nasib Akhir</p>
                      <p className="text-sm font-bold text-[#181c1c] capitalize">
                        {item.jra.nasib_akhir?.replace(/_/g, ' ') ?? '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {item.file_url && (
                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-xl border border-[#99f6e4] bg-[#f0fdf9] text-[#0f766e] text-sm font-semibold hover:bg-[#ccfbf1] transition-colors">
                  <FileText size={15} /> Lihat File Digital
                </a>
              )}
              <p className="text-xs text-[#6e7977] text-center">Dibuat: {formatDate(item.created_at, 'long')}</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ArsipPage() {
  const qc = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const { profile } = useAuthStore()

  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [viewMode, setViewMode]   = useState<'table' | 'grid'>('table')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing]     = useState<ArsipWithRel | null>(null)
  const [deleting, setDeleting]   = useState<ArsipWithRel | null>(null)
  const [detail, setDetail]       = useState<ArsipWithRel | null>(null)

  // Debounce search so Supabase query only fires 400ms after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const { data: arsipList = [], isLoading } = useQuery({
    queryKey: ['arsip', debouncedSearch],
    queryFn: async () => {
      let q = supabase
        .from('arsip')
        .select('*, klasifikasi(kode, nama), jra(kode, judul, retensi_aktif, retensi_inaktif, nasib_akhir)')
        .order('created_at', { ascending: false })
      if (debouncedSearch) {
        q = q.or(
          `judul.ilike.%${debouncedSearch}%,perihal.ilike.%${debouncedSearch}%,nomor_arsip.ilike.%${debouncedSearch}%,nomor_surat.ilike.%${debouncedSearch}%,pengirim.ilike.%${debouncedSearch}%`
        )
      }
      const { data, error } = await q
      if (error) return []
      return (data as ArsipWithRel[]) ?? []
    },
  })

  const { data: klasifikasiList = [] } = useQuery({
    queryKey: ['klasifikasi'],
    queryFn: async () => fetchAllKlasifikasi<Klasifikasi>(),
  })

  const { data: jraList = [] } = useQuery({
    queryKey: ['jra'],
    queryFn: async () => { const { data } = await supabase.from('jra').select('*').order('kode'); return (data as JRA[]) ?? [] },
  })

  const saveMutation = useMutation({
    mutationFn: async ({ data, file, id }: { data: ArsipFormData; file: File | null; id?: string }) => {
      let fileUrl: string | null = null
      if (file) {
        const ext = file.name.split('.').pop()
        const path = `arsip/${profile?.id ?? 'anon'}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage.from('arsip-files').upload(path, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('arsip-files').getPublicUrl(path)
        fileUrl = urlData.publicUrl
      }
      const nomor = id ? (editing?.nomor_arsip ?? '') : generateNomorArsip(new Date().getFullYear(), arsipList.length + 1)
      const payload: Omit<Arsip, 'id' | 'created_at' | 'updated_at'> = {
        nomor_arsip: nomor, judul: data.judul, perihal: data.perihal || null,
        id_klasifikasi: data.id_klasifikasi || null, id_jra: data.id_jra || null,
        nomor_surat: data.nomor_surat || null, tanggal_surat: data.tanggal_surat || null,
        pengirim: data.pengirim || null, tingkat_keamanan: data.tingkat_keamanan,
        media_simpan: data.media_simpan, tingkat_perkembangan: data.tingkat_perkembangan ?? null,
        kurun_waktu_mulai: data.kurun_waktu_mulai || null, kurun_waktu_selesai: data.kurun_waktu_selesai || null,
        jumlah: data.jumlah, keterangan: data.keterangan || null, status: data.status,
        file_url: fileUrl, thumbnail_url: null,
        created_by: profile?.id ?? null,
        id_instansi: profile?.id_instansi ?? null,
      }
      if (id) { const { error } = await supabase.from('arsip').update(payload).eq('id', id); if (error) throw error }
      else { const { error } = await supabase.from('arsip').insert(payload); if (error) throw error }
    },
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ['arsip'] }); showSuccess('Berhasil', vars.id ? 'Arsip diperbarui' : 'Arsip baru dimasukkan') },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (item: ArsipWithRel) => {
      if (item.file_url) {
        const path = item.file_url.split('/arsip-files/')[1]
        if (path) await supabase.storage.from('arsip-files').remove([path])
      }
      const { error } = await supabase.from('arsip').delete().eq('id', item.id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['arsip'] }); showSuccess('Berhasil', 'Arsip dihapus') },
    onError: (e) => showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan'),
  })

  const filtered = useMemo(() => {
    if (filterStatus === 'all') return arsipList
    return arsipList.filter((a) => a.status === filterStatus)
  }, [arsipList, filterStatus])

  const stats = useMemo(() => ({
    total: arsipList.length,
    aktif: arsipList.filter((a) => a.status === 'aktif').length,
    vital: arsipList.filter((a) => a.status === 'vital').length,
    digital: arsipList.filter((a) => a.file_url).length,
  }), [arsipList])

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }} className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Manajemen Arsip</h1>
            <p className="text-sm text-[#6e7977] mt-0.5">Pemberkasan dan pengelolaan dokumen arsip digital</p>
          </div>
          <Button size="sm" leftIcon={<Plus size={14} />} onClick={() => { setEditing(null); setModalOpen(true) }}>Berkas Arsip Baru</Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Arsip',  value: stats.total,   icon: <Archive size={16} />, color: 'bg-[#ccfbf1] text-[#0f766e]' },
            { label: 'Arsip Aktif',  value: stats.aktif,   icon: <Zap size={16} />,    color: 'bg-[#dcfce7] text-[#16a34a]' },
            { label: 'Arsip Vital',  value: stats.vital,   icon: <Star size={16} />,   color: 'bg-[#fef3c7] text-[#d97706]' },
            { label: 'File Digital', value: stats.digital, icon: <Upload size={16} />, color: 'bg-[#dbeafe] text-[#2563eb]' },
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

        {/* Toolbar */}
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nomor, judul, pengirim..." className="w-full pl-9 pr-3 py-2 rounded-[10px] border border-[#CBD5E1] text-sm focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 bg-white transition-all" />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter size={13} className="text-[#6e7977]" />
              {['all', 'aktif', 'inaktif', 'vital', 'permanen', 'draft'].map((val) => {
                const labels: Record<string, string> = { all: 'Semua', aktif: 'Aktif', inaktif: 'Inaktif', vital: 'Vital', permanen: 'Permanen', draft: 'Draft' }
                return <button key={val} onClick={() => setFilter(val)} className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all ${filterStatus === val ? 'bg-[#0f766e] text-white' : 'bg-[#f1f4f3] text-[#6e7977] hover:bg-[#e5e9e7]'}`}>{labels[val]}</button>
              })}
            </div>
            <div className="flex rounded-[10px] overflow-hidden border border-[#e5e9e7]">
              <button onClick={() => setViewMode('table')} className={`p-2 transition-colors ${viewMode === 'table' ? 'bg-[#0f766e] text-white' : 'bg-white text-[#6e7977] hover:bg-[#f1f4f3]'}`}><List size={15} /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#0f766e] text-white' : 'bg-white text-[#6e7977] hover:bg-[#f1f4f3]'}`}><LayoutGrid size={15} /></button>
            </div>
          </div>
        </Card>

        {/* Table */}
        {viewMode === 'table' && (
          <Card padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#e5e9e7] bg-[#f7faf8]">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-36">Nomor</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider">Judul</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Tanggal</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[#6e7977] uppercase tracking-wider w-28">Keamanan</th>
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
                  )) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-16 text-[#6e7977] text-sm"><div className="flex flex-col items-center gap-2"><Archive size={32} className="opacity-20" /><p>Tidak ada arsip yang sesuai</p></div></td></tr>
                  ) : filtered.map((item, i) => (
                    <motion.tr key={item.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }} className="border-b border-[#f1f4f3] hover:bg-[#f7faf8] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono font-bold text-[#0f766e]">{item.nomor_arsip}</span>
                        {item.file_url && <span className="ml-1.5 inline-flex"><FileText size={11} className="text-[#2563eb]" /></span>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#181c1c] line-clamp-1">{item.judul}</p>
                        {item.pengirim && <p className="text-xs text-[#6e7977]">{item.pengirim}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-[#3e4947]">{item.tanggal_surat ? formatDate(item.tanggal_surat) : '—'}</td>
                      <td className="px-4 py-3"><Badge variant={getStatusArsipColor(item.status) as never} size="sm">{statusIcon[item.status]} {statusLabelsMap[item.status]}</Badge></td>
                      <td className="px-4 py-3"><Badge variant={getTingkatKeamananLabel(item.tingkat_keamanan).color as never} size="sm">{keamananIcon[item.tingkat_keamanan]} {getTingkatKeamananLabel(item.tingkat_keamanan).label}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setDetail(item)} className="p-1.5 rounded-lg hover:bg-[#ccfbf1] text-[#6e7977] hover:text-[#0f766e]" title="Detail"><Eye size={14} /></button>
                          <button onClick={() => { setEditing(item); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]" title="Edit"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleting(item)} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]" title="Hapus"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-[#f1f4f3] bg-[#f7faf8]">
                <p className="text-xs text-[#6e7977]">Menampilkan <span className="font-semibold text-[#181c1c]">{filtered.length}</span> dari <span className="font-semibold text-[#181c1c]">{arsipList.length}</span> arsip</p>
              </div>
            )}
          </Card>
        )}

        {/* Grid */}
        {viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-[#e5e9e7] p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-[#f1f4f3] rounded w-2/3" /><div className="h-3 bg-[#f1f4f3] rounded w-full" /><div className="h-3 bg-[#f1f4f3] rounded w-3/4" />
              </div>
            )) : filtered.length === 0 ? (
              <div className="col-span-full text-center py-16 text-[#6e7977] text-sm"><Archive size={32} className="mx-auto mb-2 opacity-20" />Tidak ada arsip</div>
            ) : filtered.map((item, i) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card hover padding="md" className="h-full flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-mono font-bold text-[#0f766e]">{item.nomor_arsip}</p>
                      {item.tanggal_surat && <p className="text-xs text-[#6e7977]">{formatDate(item.tanggal_surat)}</p>}
                    </div>
                    <Badge variant={getStatusArsipColor(item.status) as never} size="sm">{statusLabelsMap[item.status]}</Badge>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[#181c1c] leading-snug line-clamp-2">{item.judul}</h3>
                    {item.pengirim && <p className="text-xs text-[#6e7977] mt-1">{item.pengirim}</p>}
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={getTingkatKeamananLabel(item.tingkat_keamanan).color as never} size="sm">{keamananIcon[item.tingkat_keamanan]} {getTingkatKeamananLabel(item.tingkat_keamanan).label}</Badge>
                    <div className="flex gap-1">
                      <button onClick={() => setDetail(item)} className="p-1.5 rounded-lg hover:bg-[#ccfbf1] text-[#6e7977] hover:text-[#0f766e]"><Eye size={13} /></button>
                      <button onClick={() => { setEditing(item); setModalOpen(true) }} className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706]"><Edit2 size={13} /></button>
                      <button onClick={() => setDeleting(item)} className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a]"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      <ArsipModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing}
        klasifikasiList={klasifikasiList}
        jraList={jraList}
        onSave={async (data, file) => { await saveMutation.mutateAsync({ data, file, id: editing?.id }) }}
      />
      <DeleteConfirm open={!!deleting} onClose={() => setDeleting(null)} item={deleting} onConfirm={async () => { if (deleting) await deleteMutation.mutateAsync(deleting) }} />
      <DetailPanel item={detail} onClose={() => setDetail(null)} onEdit={() => { setEditing(detail); setDetail(null); setModalOpen(true) }} />
    </>
  )
}
