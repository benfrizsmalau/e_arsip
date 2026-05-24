import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Building2, PenSquare, Shield,
  Save, Eye, EyeOff, CheckCircle2, Lock,
  Plus, Trash2, GripVertical, Edit2, X, AlertTriangle
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { useToast } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { formatNIP } from '@/lib/utils'

// ─── Types & Schemas ──────────────────────────────────────────────────────────
type Tab = 'profil' | 'opd' | 'pejabat' | 'keamanan'

const profilSchema = z.object({
  nama:    z.string().min(3, 'Nama minimal 3 karakter'),
  jabatan: z.string().optional(),
})
type ProfilForm = z.infer<typeof profilSchema>

const opdSchema = z.object({
  nama:       z.string().min(3, 'Nama OPD wajib diisi'),
  singkatan:  z.string().optional(),
  alamat:     z.string().optional(),
  telepon:    z.string().optional(),
  email:      z.string().email('Format email tidak valid').optional().or(z.literal('')),
  website:    z.string().optional(),
})
type OpdForm = z.infer<typeof opdSchema>

const pejabatSchema = z.object({
  nama:    z.string().min(3, 'Nama wajib diisi'),
  nip:     z.string().optional(),
  jabatan: z.string().min(3, 'Jabatan wajib diisi'),
})
type PejabatForm = z.infer<typeof pejabatSchema>

const passwordSchema = z.object({
  password_baru:   z.string().min(8, 'Minimal 8 karakter'),
  konfirmasi_baru: z.string(),
}).refine((d) => d.password_baru === d.konfirmasi_baru, {
  message: 'Password tidak cocok',
  path: ['konfirmasi_baru'],
})
type PasswordForm = z.infer<typeof passwordSchema>

interface Pejabat {
  id: string
  nama: string
  nip: string | null
  jabatan: string
  urutan: number
  aktif: boolean
}

// ─── Tab: Profil Saya ─────────────────────────────────────────────────────────
function ProfilTab() {
  const { profile, karyawan } = useAuthStore()
  const { success: showSuccess, error: showError } = useToast()
  const [saving, setSaving] = useState(false)

  const hakLabel: Record<string, string> = {
    superadmin: 'Super Admin', admin: 'Admin', agendaris: 'Agendaris',
    staf: 'Staf', pimpinan: 'Pimpinan',
  }

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfilForm>({
    defaultValues: { nama: karyawan?.nama ?? '', jabatan: karyawan?.jabatan ?? '' },
  })

  async function onSubmit(data: ProfilForm) {
    setSaving(true)
    try {
      if (karyawan?.id) {
        const { error } = await supabase
          .from('karyawan')
          .update({ nama: data.nama, jabatan: data.jabatan || null })
          .eq('id', karyawan.id)
        if (error) throw error
      }
      showSuccess('Berhasil', 'Profil berhasil diperbarui')
    } catch (e) {
      showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Identitas */}
      <Card padding="md">
        <div className="flex items-center gap-4 mb-5">
          <Avatar name={karyawan?.nama ?? 'User'} size="xl" />
          <div>
            <h3 className="font-bold text-[#181c1c] text-lg" style={{ fontFamily: 'Sora, sans-serif' }}>
              {karyawan?.nama ?? '—'}
            </h3>
            <p className="text-sm text-[#6e7977]">{karyawan?.jabatan ?? '—'}</p>
            <div className="flex gap-2 mt-2">
              {profile?.hak && <Badge variant="primary" size="sm">{hakLabel[profile.hak] ?? profile.hak}</Badge>}
              {profile?.is_agendaris && <Badge variant="info" size="sm">Agendaris</Badge>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { label: 'NIP',      value: karyawan?.nip ? formatNIP(karyawan.nip) : '—' },
            { label: 'Email',    value: karyawan?.email ?? '—' },
            { label: 'Golongan', value: karyawan?.golongan ?? '—' },
            { label: 'Tipe',     value: karyawan?.tipe === 'struktural' ? 'Struktural' : karyawan?.tipe === 'pelaksana' ? 'Pelaksana' : '—' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-[#f7faf8] px-4 py-3">
              <p className="text-xs text-[#6e7977] mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-[#181c1c]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-[#e5e9e7] pt-4">
          <h4 className="text-xs font-bold text-[#6e7977] uppercase tracking-wider mb-3">Edit Profil</h4>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <Input label="Nama Lengkap" required error={errors.nama?.message} {...register('nama')} />
            <Input label="Jabatan" placeholder="Jabatan Anda" {...register('jabatan')} />
            <div className="flex justify-end">
              <Button type="submit" loading={saving} disabled={!isDirty} leftIcon={<Save size={14} />} size="sm">
                Simpan Profil
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}

// ─── Tab: Profil OPD ──────────────────────────────────────────────────────────
function OPDTab() {
  const { profile, karyawan } = useAuthStore()
  const { success: showSuccess, error: showError } = useToast()
  const [saving, setSaving] = useState(false)

  // Query data instansi saat ini
  const { data: instansi, isLoading } = useQuery({
    queryKey: ['instansi-profil', profile?.id_instansi],
    queryFn: async () => {
      if (!profile?.id_instansi) return null
      const { data } = await supabase
        .from('instansi')
        .select('*')
        .eq('id', profile.id_instansi)
        .single()
      return data
    },
    enabled: !!profile?.id_instansi,
  })

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<OpdForm>({
    values: instansi ? {
      nama:      instansi.nama ?? '',
      singkatan: instansi.singkatan ?? '',
      alamat:    instansi.alamat ?? '',
      telepon:   instansi.telepon ?? '',
      email:     instansi.email ?? '',
      website:   instansi.website ?? '',
    } : undefined,
  })

  async function onSubmit(data: OpdForm) {
    if (!profile?.id_instansi) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('instansi')
        .update({
          nama:      data.nama,
          singkatan: data.singkatan || null,
          alamat:    data.alamat || null,
          telepon:   data.telepon || null,
          email:     data.email || null,
          website:   data.website || null,
        })
        .eq('id', profile.id_instansi)
      if (error) throw error
      showSuccess('Berhasil', 'Profil OPD berhasil diperbarui')
    } catch (e) {
      showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card padding="md">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 rounded-[10px] bg-[#f1f4f3] animate-pulse" />
          ))}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <Card padding="md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#ccfbf1] flex items-center justify-center flex-shrink-0">
            <Building2 size={18} className="text-[#0f766e]" />
          </div>
          <div>
            <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
              {instansi?.nama ?? 'Profil OPD'}
            </h3>
            <p className="text-xs text-[#6e7977]">Edit informasi satuan kerja Anda</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Nama Lengkap OPD"
            placeholder="cth: Dinas Kesehatan Kabupaten Mamberamo Raya"
            required
            error={errors.nama?.message}
            {...register('nama')}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Singkatan / Akronim"
              placeholder="cth: DINKES"
              {...register('singkatan')}
            />
            <Input
              label="Nomor Telepon"
              placeholder="cth: 0967-xxxxxx"
              type="tel"
              {...register('telepon')}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
              Alamat Kantor
            </label>
            <textarea
              rows={2}
              placeholder="Alamat lengkap kantor OPD"
              className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all resize-none"
              {...register('alamat')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Email Resmi"
              type="email"
              placeholder="nama@mamberamoraya.go.id"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Website (opsional)"
              placeholder="https://..."
              {...register('website')}
            />
          </div>

          <div className="flex justify-end pt-1">
            <Button type="submit" loading={saving} disabled={!isDirty} leftIcon={<Save size={14} />} size="sm">
              Simpan Profil OPD
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

// ─── Modal Tambah/Edit Pejabat ────────────────────────────────────────────────
function PejabatModal({
  open, onClose, editing, idInstansi, onSave,
}: {
  open: boolean
  onClose: () => void
  editing: Pejabat | null
  idInstansi: string
  onSave: () => void
}) {
  const { success: showSuccess, error: showError } = useToast()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PejabatForm>({
    resolver: zodResolver(pejabatSchema),
    defaultValues: editing
      ? { nama: editing.nama, nip: editing.nip ?? '', jabatan: editing.jabatan }
      : {},
  })

  async function submit(data: PejabatForm) {
    try {
      if (editing) {
        const { error } = await supabase
          .from('pejabat_ttd')
          .update({ nama: data.nama, nip: data.nip || null, jabatan: data.jabatan })
          .eq('id', editing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('pejabat_ttd')
          .insert({ nama: data.nama, nip: data.nip || null, jabatan: data.jabatan, id_instansi: idInstansi })
        if (error) throw error
      }
      showSuccess('Berhasil', editing ? 'Data pejabat diperbarui' : 'Pejabat berhasil ditambahkan')
      reset()
      onSave()
      onClose()
    } catch (e) {
      showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan')
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ccfbf1] flex items-center justify-center">
                  <PenSquare size={16} className="text-[#0f766e]" />
                </div>
                <div>
                  <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {editing ? 'Edit Pejabat' : 'Tambah Pejabat'}
                  </h3>
                  <p className="text-xs text-[#6e7977]">Penandatangan dokumen resmi</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#f1f4f3] text-[#6e7977]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit(submit)} className="space-y-4">
              <Input
                label="Nama Lengkap"
                placeholder="cth: dr. Yusak Mirino, M.Kes"
                required
                error={errors.nama?.message}
                {...register('nama')}
              />
              <Input
                label="NIP (opsional)"
                placeholder="18 digit NIP"
                maxLength={18}
                hint="Kosongkan jika tidak ada"
                {...register('nip')}
              />
              <Input
                label="Jabatan"
                placeholder="cth: Kepala Dinas Kesehatan"
                required
                error={errors.jabatan?.message}
                {...register('jabatan')}
              />
              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="outline" size="sm" onClick={onClose}>Batal</Button>
                <Button type="submit" loading={isSubmitting} size="sm">
                  {editing ? 'Simpan' : 'Tambah Pejabat'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Tab: Pejabat & TTD ───────────────────────────────────────────────────────
function PejabatTab() {
  const { profile } = useAuthStore()
  const qc = useQueryClient()
  const { success: showSuccess, error: showError } = useToast()
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState<Pejabat | null>(null)
  const [deleting, setDeleting]     = useState<Pejabat | null>(null)
  const [loadingDel, setLoadingDel] = useState(false)

  const { data: pejabatList = [], isLoading } = useQuery({
    queryKey: ['pejabat_ttd', profile?.id_instansi],
    queryFn: async () => {
      if (!profile?.id_instansi) return []
      const { data, error } = await supabase
        .from('pejabat_ttd')
        .select('*')
        .eq('id_instansi', profile.id_instansi)
        .eq('aktif', true)
        .order('urutan', { ascending: true })
      if (error) return []
      return data as Pejabat[]
    },
    enabled: !!profile?.id_instansi,
  })

  async function hapusPejabat(id: string) {
    setLoadingDel(true)
    try {
      const { error } = await supabase.from('pejabat_ttd').delete().eq('id', id)
      if (error) throw error
      qc.invalidateQueries({ queryKey: ['pejabat_ttd'] })
      showSuccess('Berhasil', 'Pejabat dihapus')
    } catch (e) {
      showError('Gagal', e instanceof Error ? e.message : 'Terjadi kesalahan')
    } finally {
      setLoadingDel(false)
      setDeleting(null)
    }
  }

  return (
    <>
      <div className="space-y-4">
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
                Pejabat & Penandatangan
              </h3>
              <p className="text-xs text-[#6e7977] mt-0.5">
                Daftar pejabat yang berwenang menandatangani dokumen resmi
              </p>
            </div>
            <Button
              size="sm"
              leftIcon={<Plus size={13} />}
              onClick={() => { setEditing(null); setModalOpen(true) }}
            >
              Tambah
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-[#f1f4f3] animate-pulse" />
              ))}
            </div>
          ) : pejabatList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#6e7977] gap-2">
              <PenSquare size={32} className="opacity-20" />
              <p className="text-sm">Belum ada data pejabat</p>
              <button
                onClick={() => { setEditing(null); setModalOpen(true) }}
                className="text-[#0f766e] text-xs font-semibold hover:underline"
              >
                + Tambah pejabat pertama
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {pejabatList.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[#e5e9e7] hover:border-[#99f6e4] hover:bg-[#f0fdf9] transition-all group"
                >
                  {/* Drag handle (visual only) */}
                  <GripVertical size={14} className="text-[#CBD5E1] flex-shrink-0" />

                  {/* Nomor urut */}
                  <div className="w-7 h-7 rounded-full bg-[#ccfbf1] text-[#0f766e] text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#181c1c] leading-tight">{p.nama}</p>
                    <p className="text-xs text-[#6e7977]">{p.jabatan}</p>
                    {p.nip && (
                      <p className="text-xs text-[#6e7977] font-mono">NIP: {p.nip}</p>
                    )}
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditing(p); setModalOpen(true) }}
                      className="p-1.5 rounded-lg hover:bg-[#fef9c3] text-[#6e7977] hover:text-[#d97706] transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeleting(p)}
                      className="p-1.5 rounded-lg hover:bg-[#ffdad6] text-[#6e7977] hover:text-[#ba1a1a] transition-colors"
                      title="Hapus"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="md">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#dbeafe] border border-[#93c5fd]">
            <CheckCircle2 size={16} className="text-[#2563eb] flex-shrink-0 mt-0.5" />
            <p className="text-sm text-[#1e40af]">
              Data pejabat ini digunakan sebagai referensi penandatangan pada surat keluar resmi OPD Anda.
            </p>
          </div>
        </Card>
      </div>

      {/* Modal tambah/edit */}
      <PejabatModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        editing={editing}
        idInstansi={profile?.id_instansi ?? ''}
        onSave={() => qc.invalidateQueries({ queryKey: ['pejabat_ttd'] })}
      />

      {/* Konfirmasi hapus */}
      <AnimatePresence>
        {deleting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleting(null)} />
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
                <h3 className="text-base font-bold text-[#181c1c] mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Hapus Pejabat?</h3>
                <p className="text-sm font-semibold text-[#181c1c] mb-0.5">{deleting.nama}</p>
                <p className="text-xs text-[#6e7977] mb-6">{deleting.jabatan}</p>
                <div className="flex gap-3 w-full">
                  <Button variant="outline" className="flex-1" size="sm" onClick={() => setDeleting(null)}>Batal</Button>
                  <Button variant="destructive" className="flex-1" size="sm" loading={loadingDel} onClick={() => hapusPejabat(deleting.id)}>Hapus</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Tab: Keamanan ────────────────────────────────────────────────────────────
function KeamananTab() {
  const { success: showSuccess, error: showError } = useToast()
  const [showPass, setShowPass]     = useState(false)
  const [showKonfirm, setShowKonfirm] = useState(false)
  const [saved, setSaved]           = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  async function onSubmit(data: PasswordForm) {
    const { error } = await supabase.auth.updateUser({ password: data.password_baru })
    if (error) { showError('Gagal', error.message); return }
    showSuccess('Berhasil', 'Password berhasil diperbarui')
    setSaved(true)
    reset()
    setTimeout(() => setSaved(false), 4000)
  }

  return (
    <div className="space-y-5">
      <Card padding="md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-[#ccfbf1] flex items-center justify-center">
            <Lock size={16} className="text-[#0f766e]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Ubah Password</h4>
            <p className="text-xs text-[#6e7977]">Gunakan password yang kuat dan unik</p>
          </div>
        </div>

        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 p-3 rounded-xl bg-[#dcfce7] border border-[#86efac] mb-4"
            >
              <CheckCircle2 size={15} className="text-[#16a34a]" />
              <p className="text-sm text-[#15803d] font-semibold">Password berhasil diperbarui!</p>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
              Password Baru <span className="text-[#ba1a1a]">*</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Minimal 8 karakter"
                className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm text-[#181c1c] pr-10 focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all"
                {...register('password_baru')}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977] hover:text-[#181c1c]">
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password_baru && <p className="text-xs text-[#ba1a1a]">⚠ {errors.password_baru.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
              Konfirmasi Password <span className="text-[#ba1a1a]">*</span>
            </label>
            <div className="relative">
              <input
                type={showKonfirm ? 'text' : 'password'}
                placeholder="Ulangi password baru"
                className="w-full rounded-[10px] border border-[#CBD5E1] bg-white px-4 py-2.5 text-sm text-[#181c1c] pr-10 focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all"
                {...register('konfirmasi_baru')}
              />
              <button type="button" onClick={() => setShowKonfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6e7977] hover:text-[#181c1c]">
                {showKonfirm ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.konfirmasi_baru && <p className="text-xs text-[#ba1a1a]">⚠ {errors.konfirmasi_baru.message}</p>}
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={isSubmitting} leftIcon={<Shield size={14} />} size="sm">
              Perbarui Password
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="md">
        <h4 className="text-sm font-bold text-[#181c1c] mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Tips Keamanan</h4>
        <ul className="space-y-2">
          {[
            'Gunakan minimal 8 karakter — kombinasi huruf besar, angka, dan simbol',
            'Jangan gunakan NIP atau tanggal lahir sebagai password',
            'Ganti password secara berkala setiap 3 bulan',
            'Jangan bagikan password kepada siapapun',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#3e4947]">
              <CheckCircle2 size={14} className="text-[#16a34a] flex-shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PengaturanPage() {
  const { profile } = useAuthStore()
  const isAdmin     = profile?.hak === 'admin'
  const [tab, setTab] = useState<Tab>('profil')

  // Jika bukan admin, sembunyikan tab OPD dan Pejabat
  const tabs = [
    { key: 'profil'   as Tab, label: 'Profil Saya',   icon: <User size={15} /> },
    ...(isAdmin ? [
      { key: 'opd'    as Tab, label: 'Profil OPD',    icon: <Building2 size={15} /> },
      { key: 'pejabat' as Tab, label: 'Pejabat & TTD', icon: <PenSquare size={15} /> },
    ] : []),
    { key: 'keamanan' as Tab, label: 'Keamanan',      icon: <Shield size={15} /> },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
          Pengaturan
        </h1>
        <p className="text-sm text-[#6e7977] mt-0.5">
          {isAdmin
            ? 'Kelola profil pribadi, profil OPD, pejabat, dan keamanan akun'
            : 'Kelola profil pribadi dan keamanan akun Anda'}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="lg:w-48 flex-shrink-0">
          <Card padding="sm" className="overflow-hidden">
            <nav className="space-y-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-semibold transition-all text-left ${
                    tab === t.key
                      ? 'bg-[#0f766e] text-white'
                      : 'text-[#3e4947] hover:bg-[#f1f4f3] hover:text-[#005c55]'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </nav>
          </Card>

          {/* Badge role */}
          {isAdmin && (
            <div className="mt-3 px-1">
              <div className="rounded-xl bg-[#f0fdf9] border border-[#99f6e4] p-3">
                <p className="text-xs text-[#0f766e] font-semibold mb-0.5">Role: Admin OPD</p>
                <p className="text-[11px] text-[#3e4947] leading-relaxed">
                  Anda dapat mengelola data OPD dan pejabat penandatangan.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              {tab === 'profil'   && <ProfilTab />}
              {tab === 'opd'      && <OPDTab />}
              {tab === 'pejabat'  && <PejabatTab />}
              {tab === 'keamanan' && <KeamananTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
