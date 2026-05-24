import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Building2, Plus, Search, Edit2, Trash2, X,
  Phone, Mail, Globe, MapPin, Users, FolderOpen,
  RefreshCw, AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

// ─── Types ─────────────────────────────────────────────────────────────────
interface OPDRow {
  id: string
  kode: string
  nama: string
  singkatan: string | null
  alamat: string | null
  telepon: string | null
  email: string | null
  website: string | null
  created_at: string
  user_count?: number
  arsip_count?: number
}

// ─── Schema ─────────────────────────────────────────────────────────────────
const opdSchema = z.object({
  kode:      z.string().min(1, 'Kode wajib diisi').max(20),
  nama:      z.string().min(3, 'Nama wajib diisi'),
  singkatan: z.string().max(20).optional(),
  alamat:    z.string().optional(),
  telepon:   z.string().optional(),
  email:     z.string().email('Format email tidak valid').optional().or(z.literal('')),
  website:   z.string().optional(),
})
type OPDForm = z.infer<typeof opdSchema>

// ─── Fetch / Mutations ───────────────────────────────────────────────────────
async function fetchOPDList(): Promise<OPDRow[]> {
  const { data, error } = await supabase.from('instansi').select('*').order('kode')
  if (error) return []
  return (data as OPDRow[]) ?? []
}

async function createOPD(form: OPDForm) {
  const { error } = await supabase.from('instansi').insert({
    kode: form.kode, nama: form.nama,
    singkatan: form.singkatan || null, alamat: form.alamat || null,
    telepon: form.telepon || null, email: form.email || null, website: form.website || null,
  })
  if (error) throw error
}

async function updateOPD(id: string, form: OPDForm) {
  const { error } = await supabase.from('instansi').update({
    kode: form.kode, nama: form.nama,
    singkatan: form.singkatan || null, alamat: form.alamat || null,
    telepon: form.telepon || null, email: form.email || null, website: form.website || null,
  }).eq('id', id)
  if (error) throw error
}

async function deleteOPD(id: string) {
  const { error } = await supabase.from('instansi').delete().eq('id', id)
  if (error) throw error
}

// ─── OPD Modal ──────────────────────────────────────────────────────────────
function OPDModal({ opd, onClose }: { opd: OPDRow | null; onClose: () => void }) {
  const isEdit = !!opd
  const qc = useQueryClient()
  const { addToast } = useUIStore()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OPDForm>({
    resolver: zodResolver(opdSchema),
    defaultValues: opd ? {
      kode: opd.kode, nama: opd.nama,
      singkatan: opd.singkatan ?? '', alamat: opd.alamat ?? '',
      telepon: opd.telepon ?? '', email: opd.email ?? '', website: opd.website ?? '',
    } : {},
  })

  const createMut = useMutation({ mutationFn: createOPD })
  const updateMut = useMutation({ mutationFn: (f: OPDForm) => updateOPD(opd!.id, f) })

  async function onSubmit(form: OPDForm) {
    try {
      if (isEdit) await updateMut.mutateAsync(form)
      else        await createMut.mutateAsync(form)
      qc.invalidateQueries({ queryKey: ['admin-opd'] })
      addToast({ type: 'success', message: isEdit ? 'OPD berhasil diperbarui' : 'OPD berhasil ditambahkan' })
      onClose()
    } catch {
      addToast({ type: 'error', message: 'Gagal menyimpan data OPD' })
    }
  }

  const FIELDS: { label: string; key: keyof OPDForm; Icon: React.ComponentType<{ size?: number; className?: string }>; required?: boolean; ph: string }[] = [
    { label: 'Kode OPD',  key: 'kode',      Icon: Building2, required: true, ph: 'cth: DINKES' },
    { label: 'Nama OPD',  key: 'nama',      Icon: Building2, required: true, ph: 'Nama lengkap OPD' },
    { label: 'Singkatan', key: 'singkatan', Icon: Building2, ph: 'cth: DINKES' },
    { label: 'Alamat',    key: 'alamat',    Icon: MapPin,    ph: 'Alamat kantor' },
    { label: 'Telepon',   key: 'telepon',   Icon: Phone,     ph: '0967-XXXXXX' },
    { label: 'Email',     key: 'email',     Icon: Mail,      ph: 'opd@mambrarayakab.go.id' },
    { label: 'Website',   key: 'website',   Icon: Globe,     ph: 'https://...' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-5 border-b border-[#e5e9e7]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#904d00] to-[#fe932c] flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <h2 className="font-bold text-[#181c1c]">{isEdit ? 'Edit OPD' : 'Tambah OPD Baru'}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
            {FIELDS.map(({ label, key, Icon, required, ph }) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-[#3e4947] mb-1.5">
                  {label} {required && <span className="text-[#ba1a1a]">*</span>}
                </label>
                <div className="relative">
                  <Icon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
                  <input
                    {...register(key)}
                    placeholder={ph}
                    className={cn(
                      'w-full pl-9 pr-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all',
                      errors[key]
                        ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/20 bg-[#fff0f0]'
                        : 'border-[#e5e9e7] focus:ring-[#fe932c]/20 focus:border-[#fe932c] bg-[#f7faf9]'
                    )}
                  />
                </div>
                {errors[key] && (
                  <p className="text-xs text-[#ba1a1a] mt-1 flex items-center gap-1">
                    <AlertTriangle size={11} /> {errors[key]!.message}
                  </p>
                )}
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 text-sm font-medium border border-[#e5e9e7] rounded-xl hover:bg-[#f1f4f3] transition-colors text-[#3e4947]">
                Batal
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex-1 py-2.5 text-sm font-semibold bg-gradient-to-r from-[#904d00] to-[#fe932c] text-white rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
                {isSubmitting ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah OPD'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Delete Confirm ──────────────────────────────────────────────────────────
function DeleteConfirm({ opd, onClose }: { opd: OPDRow; onClose: () => void }) {
  const qc = useQueryClient()
  const { addToast } = useUIStore()
  const mut = useMutation({
    mutationFn: () => deleteOPD(opd.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-opd'] })
      addToast({ type: 'success', message: `OPD ${opd.singkatan ?? opd.nama} berhasil dihapus` })
      onClose()
    },
    onError: () => addToast({ type: 'error', message: 'Gagal menghapus OPD' }),
  })

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#fff0f0] flex items-center justify-center">
              <AlertTriangle size={22} className="text-[#ba1a1a]" />
            </div>
            <div>
              <h3 className="font-bold text-[#181c1c] text-base">Hapus OPD?</h3>
              <p className="text-sm text-[#6e7977] mt-1">
                OPD <strong>{opd.nama}</strong> dan semua data terkaitnya akan dihapus permanen.
              </p>
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium border border-[#e5e9e7] rounded-xl hover:bg-[#f1f4f3] transition-colors">Batal</button>
              <button onClick={() => mut.mutate()} disabled={mut.isPending}
                className="flex-1 py-2.5 text-sm font-semibold bg-[#ba1a1a] text-white rounded-xl hover:bg-[#991515] disabled:opacity-60 transition-colors">
                {mut.isPending ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminOPDPage() {
  const [search, setSearch]           = useState('')
  const [modalOPD, setModalOPD]       = useState<OPDRow | null | false>(false)
  const [deleteItem, setDeleteItem]   = useState<OPDRow | null>(null)

  const { data: opdList = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-opd'],
    queryFn: fetchOPDList,
  })

  const filtered = useMemo(() => {
    if (!search) return opdList
    const q = search.toLowerCase()
    return opdList.filter(o =>
      o.nama.toLowerCase().includes(q) ||
      (o.singkatan ?? '').toLowerCase().includes(q) ||
      o.kode.toLowerCase().includes(q)
    )
  }, [opdList, search])

  const totalUsers = useMemo(() => opdList.reduce((s, o) => s + (o.user_count ?? 0), 0), [opdList])
  const totalArsip = useMemo(() => opdList.reduce((s, o) => s + (o.arsip_count ?? 0), 0), [opdList])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
            Manajemen OPD
          </h1>
          <p className="text-sm text-[#6e7977] mt-1">
            Kelola seluruh Organisasi Perangkat Daerah Kabupaten Mamberamo Raya
          </p>
        </div>
        <button
          onClick={() => setModalOPD(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#904d00] to-[#fe932c] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} /> Tambah OPD
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { label: 'Total OPD',     value: opdList.length, Icon: Building2,  color: 'bg-[#fe932c]' },
          { label: 'Total Pegawai', value: totalUsers,      Icon: Users,      color: 'bg-[#0f766e]' },
          { label: 'Total Arsip',   value: totalArsip,      Icon: FolderOpen, color: 'bg-[#904d00]' },
        ] as const).map(s => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-[#e5e9e7] p-5 flex items-center gap-4"
          >
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', s.color)}>
              <s.Icon size={20} className="text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-[#181c1c]">{s.value}</div>
              <div className="text-xs text-[#6e7977] font-medium">{s.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[#e5e9e7]">
          <div className="relative flex-1 max-w-sm">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977]" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama atau kode OPD…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-[#f7faf9] border border-[#e5e9e7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#fe932c]/20 focus:border-[#fe932c]"
            />
          </div>
          <button onClick={() => refetch()} className="p-2 rounded-xl border border-[#e5e9e7] bg-[#f7faf9] text-[#6e7977] hover:text-[#fe932c] transition-colors">
            <RefreshCw size={15} />
          </button>
          <span className="text-xs text-[#6e7977] ml-auto font-medium">{filtered.length} OPD</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-[3px] border-[#fe932c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-[#6e7977]">
            <Building2 size={32} className="opacity-30" />
            <p className="text-sm">Tidak ada OPD ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5e9e7] text-[#6e7977]">
                  {['Kode', 'Nama OPD', 'Kontak', 'Pengguna', 'Arsip', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider first:pl-5 last:pr-5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((opd, i) => (
                  <motion.tr key={opd.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-[#f1f4f3] hover:bg-[#fdf8f4] transition-colors"
                  >
                    <td className="pl-5 pr-4 py-4">
                      <span className="font-bold text-xs bg-[#fef3e2] text-[#904d00] border border-[#fe932c]/30 px-2 py-0.5 rounded-lg">
                        {opd.kode}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#f1f4f3] flex items-center justify-center flex-shrink-0">
                          <Building2 size={16} className="text-[#6e7977]" />
                        </div>
                        <div>
                          <div className="font-semibold text-[#181c1c] leading-tight">{opd.nama}</div>
                          {opd.singkatan && <div className="text-[11px] text-[#6e7977] mt-0.5">{opd.singkatan}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        {opd.telepon && <div className="flex items-center gap-1.5 text-xs text-[#3e4947]"><Phone size={11} className="text-[#6e7977]" /> {opd.telepon}</div>}
                        {opd.email   && <div className="flex items-center gap-1.5 text-xs text-[#3e4947]"><Mail size={11} className="text-[#6e7977]" /> {opd.email}</div>}
                        {!opd.telepon && !opd.email && <span className="text-xs text-[#6e7977]">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#3e4947]">
                        <Users size={14} className="text-[#6e7977]" /> {opd.user_count ?? 0}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#3e4947]">
                        <FolderOpen size={14} className="text-[#6e7977]" /> {opd.arsip_count ?? 0}
                      </div>
                    </td>
                    <td className="pl-4 pr-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setModalOPD(opd)}
                          className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977] hover:text-[#fe932c] transition-colors" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteItem(opd)}
                          className="p-1.5 rounded-lg hover:bg-[#fff0f0] text-[#6e7977] hover:text-[#ba1a1a] transition-colors" title="Hapus">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOPD !== false && <OPDModal opd={modalOPD} onClose={() => setModalOPD(false)} />}
      {deleteItem && <DeleteConfirm opd={deleteItem} onClose={() => setDeleteItem(null)} />}
    </motion.div>
  )
}
