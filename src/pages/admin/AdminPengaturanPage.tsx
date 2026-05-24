import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ShieldCheck, Settings, Info, Database,
  BookOpen, Tag, Edit2, Check, X,
  Server, Globe, Lock, Bell, ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/uiStore'

// ─── System Info ─────────────────────────────────────────────────────────────
const SYSTEM_INFO = [
  { label: 'Versi Aplikasi',      value: 'v1.0.0',              icon: Info },
  { label: 'Database',            value: 'Supabase PostgreSQL',  icon: Database },
  { label: 'Framework',           value: 'Vite 5 + React 18',   icon: Server },
  { label: 'Region Server',       value: 'Asia Pacific (SEA)',   icon: Globe },
]

// ─── Kebijakan Schema ─────────────────────────────────────────────────────────
const kebijakanSchema = z.object({
  nama_kabupaten:   z.string().min(3, 'Wajib diisi'),
  nama_dinas:       z.string().min(3, 'Wajib diisi'),
  tahun_aktif:      z.string().min(4, 'Wajib diisi'),
  max_file_mb:      z.coerce.number().min(1).max(100),
  notif_retensi:    z.boolean(),
  notif_surat:      z.boolean(),
})
type KebijakanForm = z.infer<typeof kebijakanSchema>

// ─── Stat Info Card ───────────────────────────────────────────────────────────
function InfoCard({ label, value, icon: Icon }: {
  label: string; value: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}) {
  return (
    <div className="flex items-center gap-4 p-4 bg-[#f7faf9] rounded-xl border border-[#e5e9e7]">
      <div className="w-9 h-9 rounded-xl bg-[#fef3e2] flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-[#904d00]" />
      </div>
      <div>
        <div className="text-xs text-[#6e7977] font-medium">{label}</div>
        <div className="text-sm font-semibold text-[#181c1c]">{value}</div>
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }: {
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e5e9e7] overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b border-[#e5e9e7]">
        <div className="w-8 h-8 rounded-lg bg-[#fef3e2] flex items-center justify-center">
          <Icon size={16} className="text-[#904d00]" />
        </div>
        <h2 className="font-bold text-[#181c1c] text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── Kebijakan Form ───────────────────────────────────────────────────────────
function KebijakanSection() {
  const [editing, setEditing] = useState(false)
  const { addToast } = useUIStore()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<KebijakanForm>({
    resolver: zodResolver(kebijakanSchema),
    defaultValues: {
      nama_kabupaten: 'Kabupaten Mamberamo Raya',
      nama_dinas:     'Dinas Kearsipan dan Perpustakaan',
      tahun_aktif:    new Date().getFullYear().toString(),
      max_file_mb:    10,
      notif_retensi:  true,
      notif_surat:    true,
    },
  })

  async function onSubmit(_form: KebijakanForm) {
    await new Promise(r => setTimeout(r, 800))
    addToast({ type: 'success', message: 'Kebijakan sistem berhasil disimpan' })
    setEditing(false)
  }

  return (
    <Section title="Kebijakan Sistem" icon={Settings}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {[
          { label: 'Nama Kabupaten',   key: 'nama_kabupaten' as const,   ph: 'Kabupaten ...' },
          { label: 'Nama Dinas',        key: 'nama_dinas' as const,        ph: 'Dinas Kearsipan ...' },
          { label: 'Tahun Aktif',       key: 'tahun_aktif' as const,       ph: '2025' },
          { label: 'Batas File Upload (MB)', key: 'max_file_mb' as const,  ph: '10' },
        ].map(({ label, key, ph }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-[#3e4947] mb-1.5">{label}</label>
            <input
              {...register(key)}
              disabled={!editing}
              placeholder={ph}
              className={cn(
                'w-full px-3 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-all',
                !editing ? 'bg-[#f7faf9] text-[#6e7977] cursor-not-allowed border-[#e5e9e7]'
                  : errors[key] ? 'border-[#ba1a1a] focus:ring-[#ba1a1a]/20 bg-[#fff0f0]'
                  : 'border-[#e5e9e7] focus:ring-[#fe932c]/20 focus:border-[#fe932c] bg-white'
              )}
            />
            {errors[key] && <p className="text-xs text-[#ba1a1a] mt-1">{errors[key]!.message}</p>}
          </div>
        ))}

        {/* Notifikasi toggles */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-[#3e4947]">Notifikasi Sistem</label>
          {[
            { key: 'notif_retensi' as const, label: 'Notifikasi retensi arsip jatuh tempo' },
            { key: 'notif_surat'   as const, label: 'Notifikasi surat masuk baru' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input type="checkbox" {...register(key)} disabled={!editing} className="sr-only peer" />
                <div className={cn(
                  'w-11 h-6 rounded-full transition-colors border',
                  !editing ? 'bg-[#f1f4f3] border-[#e5e9e7]' : 'bg-[#f1f4f3] peer-checked:bg-[#0f766e] border-[#e5e9e7] peer-checked:border-[#0f766e]'
                )} />
                <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
              </div>
              <span className="text-sm text-[#3e4947]">{label}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#904d00] to-[#fe932c] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
              <Edit2 size={14} /> Edit Kebijakan
            </button>
          ) : (
            <>
              <button type="button" onClick={() => setEditing(false)}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#e5e9e7] text-sm font-medium rounded-xl hover:bg-[#f1f4f3] transition-colors text-[#3e4947]">
                <X size={14} /> Batal
              </button>
              <button type="submit" disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#904d00] to-[#fe932c] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-60 transition-all">
                <Check size={14} /> {isSubmitting ? 'Menyimpan…' : 'Simpan'}
              </button>
            </>
          )}
        </div>
      </form>
    </Section>
  )
}

// ─── Klasifikasi Quick View ───────────────────────────────────────────────────
const KLASIFIKASI_SAMPLE = [
  { kode: '000', nama: 'Umum / Komunikasi dan Informasi' },
  { kode: '100', nama: 'Pemerintahan' },
  { kode: '200', nama: 'Politik' },
  { kode: '300', nama: 'Keamanan dan Ketertiban' },
  { kode: '400', nama: 'Kesejahteraan Rakyat' },
  { kode: '500', nama: 'Perekonomian' },
  { kode: '600', nama: 'Pekerjaan Umum' },
  { kode: '700', nama: 'Pengawasan' },
  { kode: '800', nama: 'Kepegawaian' },
  { kode: '900', nama: 'Keuangan' },
]

// ─── Danger Zone ─────────────────────────────────────────────────────────────
function DangerZone() {
  const [confirm, setConfirm] = useState('')
  const { addToast } = useUIStore()

  return (
    <Section title="Zona Berbahaya" icon={AlertTriangle}>
      <div className="space-y-4">
        <div className="bg-[#fff0f0] border border-[#ba1a1a]/20 rounded-xl p-4">
          <div className="font-semibold text-[#ba1a1a] text-sm mb-1">Reset Data Demo</div>
          <p className="text-xs text-[#6e7977] mb-3">
            Hapus semua data demonstrasi dan mulai dari awal. Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex items-center gap-3">
            <input
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder='Ketik "RESET" untuk konfirmasi'
              className="flex-1 px-3 py-2 text-sm border border-[#ba1a1a]/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ba1a1a]/20 bg-white"
            />
            <button
              onClick={() => {
                if (confirm !== 'RESET') {
                  addToast({ type: 'error', message: 'Ketik RESET untuk konfirmasi' })
                  return
                }
                addToast({ type: 'info', message: 'Fitur ini belum aktif di versi production' })
                setConfirm('')
              }}
              className="px-4 py-2 text-sm font-semibold bg-[#ba1a1a] text-white rounded-xl hover:bg-[#991515] disabled:opacity-40 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function AdminPengaturanPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-6"
    >
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
          Pengaturan Sistem
        </h1>
        <p className="text-sm text-[#6e7977] mt-1">
          Konfigurasi sistem E-Arsip Kabupaten Mamberamo Raya
        </p>
      </div>

      {/* System Info */}
      <Section title="Informasi Sistem" icon={Info}>
        <div className="grid grid-cols-2 gap-3">
          {SYSTEM_INFO.map(s => (
            <InfoCard key={s.label} label={s.label} value={s.value} icon={s.icon} />
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#0f766e] bg-[#f0fdf4] border border-[#0f766e]/20 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-[#0f766e] animate-pulse" />
          Semua layanan beroperasi normal
        </div>
      </Section>

      {/* Kebijakan */}
      <KebijakanSection />

      {/* Klasifikasi Arsip */}
      <Section title="Klasifikasi Arsip (Referensi)" icon={BookOpen}>
        <p className="text-xs text-[#6e7977] mb-4">
          Kode klasifikasi arsip yang digunakan secara sistem-wide. Pengelolaan detail dilakukan di menu{' '}
          <strong>Klasifikasi & JRA</strong>.
        </p>
        <div className="space-y-2">
          {KLASIFIKASI_SAMPLE.map(k => (
            <div key={k.kode} className="flex items-center gap-3 px-3 py-2.5 bg-[#f7faf9] rounded-xl hover:bg-[#fef3e2] transition-colors group">
              <span className="font-bold text-xs text-[#904d00] bg-[#fef3e2] group-hover:bg-[#fee] px-2 py-0.5 rounded-lg w-10 text-center flex-shrink-0 transition-colors">
                {k.kode}
              </span>
              <span className="text-sm text-[#3e4947]">{k.nama}</span>
              <ChevronRight size={14} className="ml-auto text-[#6e7977] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-[#6e7977] text-center">
          Berdasarkan Perka ANRI No. 19 Tahun 2012
        </div>
      </Section>

      {/* Security note */}
      <Section title="Keamanan & Akses" icon={Lock}>
        <div className="space-y-3">
          {[
            { label: 'RLS (Row Level Security)',  status: 'Aktif',    ok: true  },
            { label: 'Auth JWT',                  status: 'Aktif',    ok: true  },
            { label: 'Storage Policies',          status: 'Aktif',    ok: true  },
            { label: '2FA / MFA',                 status: 'Belum aktif', ok: false },
            { label: 'Audit Log',                 status: 'Belum aktif', ok: false },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[#f1f4f3] last:border-0">
              <span className="text-sm text-[#3e4947]">{item.label}</span>
              <span className={cn(
                'text-xs font-semibold px-2.5 py-1 rounded-full',
                item.ok ? 'bg-[#f0fdf4] text-[#0f766e]' : 'bg-[#f1f4f3] text-[#6e7977]'
              )}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {/* Danger Zone */}
      <DangerZone />
    </motion.div>
  )
}
