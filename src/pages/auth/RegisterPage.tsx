import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, User, Mail, Lock, Hash, Briefcase,
  ArrowRight, ArrowLeft, Building2, Check,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/stores/uiStore'

// ─── Schema ───────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  nama:        z.string().min(3, 'Nama minimal 3 karakter'),
  nip:         z.string().length(18, 'NIP harus 18 digit').regex(/^\d+$/, 'NIP hanya angka'),
  jabatan:     z.string().optional(),
  id_instansi: z.string().min(1, 'Pilih satuan kerja'),
  email:       z.string().email('Format email tidak valid'),
  password:    z.string().min(8, 'Password minimal 8 karakter'),
  konfirmasi:  z.string(),
}).refine((d) => d.password === d.konfirmasi, {
  message: 'Password tidak cocok',
  path: ['konfirmasi'],
})

type RegisterForm = z.infer<typeof registerSchema>

// ─── Step definitions ─────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: 'Data Diri',    desc: 'Nama, NIP & jabatan' },
  { id: 2, label: 'Satuan Kerja', desc: 'OPD / SKPD Anda'     },
  { id: 3, label: 'Akun',         desc: 'Email & password'     },
]

// Fields to validate per step (jabatan is optional → not in trigger list)
const STEP_FIELDS: Record<number, (keyof RegisterForm)[]> = {
  1: ['nama', 'nip'],
  2: ['id_instansi'],
  3: ['email', 'password', 'konfirmasi'],
}

// ─── Slide animation variants ─────────────────────────────────────────────────
const variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 56 : -56, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  exit:  (dir: number) => ({ x: dir > 0 ? -56 : 56, opacity: 0, transition: { duration: 0.18 } }),
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const [step, setStep]               = useState(1)
  const [dir, setDir]                 = useState(1)   // 1=forward, -1=back
  const [isLoading, setIsLoading]     = useState(false)
  const [success, setSuccess]         = useState(false)
  const [instansiList, setInstansiList] = useState<{ id: string; nama: string; singkatan: string | null }[]>([])
  const [loadingInstansi, setLoadingInstansi] = useState(true)
  const { success: showSuccess, error: showError } = useToast()
  const navigate = useNavigate()

  // Load instansi list
  useEffect(() => {
    supabase
      .from('instansi')
      .select('id, nama, singkatan')
      .order('nama')
      .then(({ data }) => { if (data?.length) setInstansiList(data) })
      .finally(() => setLoadingInstansi(false))
  }, [])

  const { register, handleSubmit, trigger, watch, formState: { errors } } =
    useForm<RegisterForm>({ resolver: zodResolver(registerSchema), mode: 'onTouched' })

  // ── Navigation
  async function goNext() {
    const ok = await trigger(STEP_FIELDS[step])
    if (!ok) return
    setDir(1)
    setStep(s => s + 1)
  }
  function goBack() {
    setDir(-1)
    setStep(s => s - 1)
  }

  // ── Submit
  async function onSubmit(data: RegisterForm) {
    setIsLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Gagal membuat akun')

      const { error: regError } = await supabase.rpc('register_user', {
        p_nip:         data.nip,
        p_nama:        data.nama,
        p_jabatan:     data.jabatan || null,
        p_id_instansi: data.id_instansi,
        p_email:       data.email,
      })

      if (regError) {
        console.warn('RPC register_user gagal, fallback ke insert langsung:', regError.message)
        await supabase.from('karyawan').upsert({
          nip: data.nip, nama: data.nama,
          jabatan: data.jabatan || null,
          id_instansi: data.id_instansi,
          email: data.email,
        })
        await supabase.from('user_profiles').insert({
          id: authData.user.id,
          nip: data.nip,
          id_instansi: data.id_instansi,
          hak: 'staf',
        })
      }

      setSuccess(true)
      showSuccess('Pendaftaran Berhasil', 'Akun Anda sedang diverifikasi administrator')
    } catch (err) {
      showError('Pendaftaran Gagal', err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.93 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="bg-white rounded-[20px] p-10 text-center max-w-sm w-full shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-[#e5e9e7]"
        >
          <div className="w-16 h-16 rounded-full bg-[#dcfce7] flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-[#16a34a]" strokeWidth={2.5} />
          </div>
          <h2 className="text-xl font-bold text-[#181c1c] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            Pendaftaran Berhasil!
          </h2>
          <p className="text-[#6e7977] text-sm mb-6">
            Akun Anda sedang dalam proses verifikasi oleh Administrator.
            Anda akan dihubungi melalui email.
          </p>
          <Button onClick={() => navigate('/auth/login')} className="w-full">
            Kembali ke Login
          </Button>
        </motion.div>
      </div>
    )
  }

  // ── Wizard
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7faf8] p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-[20px] border border-[#e5e9e7] shadow-[0_4px_24px_rgba(0,0,0,0.08)] overflow-hidden">

          {/* ── Header ── */}
          <div className="bg-gradient-to-r from-[#005c55] to-[#0f766e] px-8 pt-8 pb-6 text-center">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={22} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Sora, sans-serif' }}>
              Pendaftaran Akun Baru
            </h1>
            <p className="text-white/70 text-xs mt-0.5">E-Arsip Mamberamo Raya</p>

            {/* Step indicator */}
            <div className="flex items-center justify-center mt-5 gap-0">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center">
                  {/* Circle */}
                  <div className="flex flex-col items-center gap-1">
                    <motion.div
                      animate={{
                        backgroundColor: step > s.id ? '#16a34a' : step === s.id ? '#ffffff' : 'rgba(255,255,255,0.25)',
                        scale: step === s.id ? 1.1 : 1,
                      }}
                      transition={{ duration: 0.25 }}
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      {step > s.id
                        ? <Check size={14} className="text-white" strokeWidth={3} />
                        : <span className={`text-xs font-bold ${step === s.id ? 'text-[#005c55]' : 'text-white/60'}`}>
                            {s.id}
                          </span>
                      }
                    </motion.div>
                    <span className={`text-[10px] font-medium whitespace-nowrap transition-colors ${
                      step >= s.id ? 'text-white' : 'text-white/40'
                    }`}>
                      {s.label}
                    </span>
                  </div>
                  {/* Connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="relative mx-2 mb-4" style={{ width: 40 }}>
                      <div className="h-0.5 w-full bg-white/20 rounded-full" />
                      <motion.div
                        animate={{ width: step > s.id ? '100%' : '0%' }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="absolute inset-0 h-0.5 bg-white rounded-full origin-left"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Step content ── */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
              <AnimatePresence custom={dir} mode="popLayout">
                <motion.div
                  key={step}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  className="p-8 space-y-5"
                >
                  {/* ─── Step 1: Data Diri ─── */}
                  {step === 1 && (
                    <>
                      <StepHeader
                        num="1"
                        title="Data Diri"
                        subtitle="Masukkan identitas Anda"
                      />
                      <Input
                        label="Nama Lengkap"
                        placeholder="Masukkan nama lengkap"
                        leftIcon={<User size={15} />}
                        error={errors.nama?.message}
                        required
                        {...register('nama')}
                      />
                      <Input
                        label="NIP"
                        placeholder="18 digit NIP"
                        leftIcon={<Hash size={15} />}
                        error={errors.nip?.message}
                        hint="Masukkan 18 digit tanpa spasi"
                        maxLength={18}
                        required
                        {...register('nip')}
                      />
                      <Input
                        label="Jabatan"
                        placeholder="Jabatan Anda (opsional)"
                        leftIcon={<Briefcase size={15} />}
                        {...register('jabatan')}
                      />
                    </>
                  )}

                  {/* ─── Step 2: Satuan Kerja ─── */}
                  {step === 2 && (
                    <>
                      <StepHeader
                        num="2"
                        title="Satuan Kerja"
                        subtitle="Pilih OPD / SKPD tempat Anda bertugas"
                      />
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-[#181c1c] uppercase tracking-wider">
                          Satuan Kerja <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <div className="relative">
                          <Building2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6e7977] pointer-events-none" />
                          <select
                            disabled={loadingInstansi}
                            className="w-full rounded-[10px] border border-[#CBD5E1] bg-white pl-9 pr-4 py-2.5 text-sm text-[#181c1c] focus:outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/15 transition-all disabled:opacity-60 disabled:cursor-wait appearance-none"
                            {...register('id_instansi')}
                          >
                            <option value="">
                              {loadingInstansi ? 'Memuat daftar SKPD…' : 'Pilih Satuan Kerja'}
                            </option>
                            {instansiList.map((inst) => (
                              <option key={inst.id} value={inst.id}>
                                {inst.singkatan ? `${inst.singkatan} — ` : ''}{inst.nama}
                              </option>
                            ))}
                          </select>
                        </div>
                        {errors.id_instansi && (
                          <p className="text-xs text-[#ba1a1a]">⚠ {errors.id_instansi.message}</p>
                        )}
                      </div>

                      {/* Preview instansi terpilih */}
                      {watch('id_instansi') && (() => {
                        const found = instansiList.find(i => i.id === watch('id_instansi'))
                        return found ? (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-3 rounded-[10px] bg-[#f0faf9] border border-[#a7f3d0] px-4 py-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#0f766e] flex items-center justify-center flex-shrink-0">
                              <Building2 size={14} className="text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-[#005c55]">{found.singkatan ?? '—'}</p>
                              <p className="text-xs text-[#6e7977] leading-tight">{found.nama}</p>
                            </div>
                          </motion.div>
                        ) : null
                      })()}
                    </>
                  )}

                  {/* ─── Step 3: Akun ─── */}
                  {step === 3 && (
                    <>
                      <StepHeader
                        num="3"
                        title="Akun & Keamanan"
                        subtitle="Email dinas dan kata sandi Anda"
                      />
                      <Input
                        label="Email Dinas"
                        type="email"
                        placeholder="nama@mamberamoraya.go.id"
                        leftIcon={<Mail size={15} />}
                        error={errors.email?.message}
                        required
                        {...register('email')}
                      />
                      <Input
                        label="Password"
                        type="password"
                        placeholder="Minimal 8 karakter"
                        leftIcon={<Lock size={15} />}
                        error={errors.password?.message}
                        required
                        {...register('password')}
                      />
                      <Input
                        label="Konfirmasi Password"
                        type="password"
                        placeholder="Ulangi password"
                        leftIcon={<Lock size={15} />}
                        error={errors.konfirmasi?.message}
                        required
                        {...register('konfirmasi')}
                      />
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Navigation buttons ── */}
            <div className="px-8 pb-8 flex gap-3">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  leftIcon={<ArrowLeft size={15} />}
                  onClick={goBack}
                  className="flex-1"
                >
                  Kembali
                </Button>
              )}
              {step < 3 ? (
                <Button
                  type="button"
                  rightIcon={<ArrowRight size={15} />}
                  onClick={goNext}
                  className="flex-1"
                >
                  Lanjut
                </Button>
              ) : (
                <Button
                  type="submit"
                  loading={isLoading}
                  rightIcon={<ArrowRight size={16} />}
                  className="flex-1"
                  size="lg"
                >
                  Daftar Sekarang
                </Button>
              )}
            </div>
          </form>

          {/* ── Footer link ── */}
          <div className="px-8 pb-8 text-center -mt-2">
            <p className="text-sm text-[#6e7977]">
              Sudah punya akun?{' '}
              <Link to="/auth/login" className="text-[#0f766e] font-semibold hover:underline">
                Masuk
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  )
}

// ─── Helper sub-component ─────────────────────────────────────────────────────
function StepHeader({ num, title, subtitle }: { num: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-1">
      <div className="w-8 h-8 rounded-full bg-[#005c55] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-bold">{num}</span>
      </div>
      <div>
        <h2 className="text-sm font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
          {title}
        </h2>
        <p className="text-xs text-[#6e7977]">{subtitle}</p>
      </div>
    </div>
  )
}
