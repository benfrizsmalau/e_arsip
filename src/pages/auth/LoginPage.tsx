import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { BookOpen, Mail, Lock, ArrowRight, BarChart3, Users, Zap } from 'lucide-react'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/stores/uiStore'

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})
type LoginForm = z.infer<typeof loginSchema>

const stats = [
  { icon: BarChart3, value: '14.250', label: 'Dokumen Arsip', color: 'text-[#a3faef]' },
  { icon: Users, value: '28', label: 'SKPD Aktif', color: 'text-[#a3faef]' },
  { icon: Zap, value: '99.9%', label: 'Uptime Sistem', color: 'text-[#a3faef]' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { error: showError } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit({ email, password }: LoginForm) {
    setIsLoading(true)
    try {
      await signIn(email, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      showError('Login Gagal', err instanceof Error ? err.message : 'Email atau password salah')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Hero Panel */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #003d38 0%, #005c55 40%, #0f766e 70%, #0d9488 100%)' }}>

        {/* Background texture */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        />

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col justify-between h-full p-12"
        >
          {/* Logo */}
          <motion.div variants={itemVariants} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[10px] bg-white/20 flex items-center justify-center">
              <BookOpen size={20} className="text-white" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
                E-Arsip
              </div>
              <div className="text-white/60 text-xs">Mamberamo Raya</div>
            </div>
          </motion.div>

          {/* Main text */}
          <motion.div variants={itemVariants} className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight" style={{ fontFamily: 'Sora, sans-serif' }}>
              Sistem Informasi<br />
              Manajemen Arsip<br />
              <span className="text-[#a3faef]">Digital</span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-xs">
              Pengelolaan arsip daerah yang efisien, terintegrasi, dan berstandar kearsipan nasional untuk Pemerintah Kabupaten Mamberamo Raya.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {stats.map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-[14px] p-4 border border-white/10">
                <Icon size={18} className={color} />
                <div className="text-2xl font-bold text-white mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {value}
                </div>
                <div className="text-white/60 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Login Panel */}
      <div className="w-full lg:w-[480px] flex items-center justify-center p-8 bg-white">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.1 }}
          className="w-full max-w-[380px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-[10px] bg-[#0f766e] flex items-center justify-center">
              <BookOpen size={18} className="text-white" />
            </div>
            <div>
              <div className="text-[#005c55] font-bold text-base" style={{ fontFamily: 'Sora, sans-serif' }}>E-Arsip Mamberamo Raya</div>
            </div>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>
              Selamat Datang
            </h2>
            <p className="text-[#6e7977] text-sm mt-1">
              Masuk ke akun E-Arsip Anda untuk melanjutkan
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Dinas"
              type="email"
              placeholder="nama@mamberamoraya.go.id"
              leftIcon={<Mail size={16} />}
              error={errors.email?.message}
              required
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Masukkan password"
              leftIcon={<Lock size={16} />}
              error={errors.password?.message}
              required
              {...register('password')}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#CBD5E1] accent-[#0f766e]" />
                <span className="text-xs text-[#6e7977]">Ingat saya</span>
              </label>
              <Link
                to="/auth/lupa-password"
                className="text-xs text-[#0f766e] hover:underline font-medium"
              >
                Lupa password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              rightIcon={<ArrowRight size={16} />}
              className="w-full"
            >
              Masuk
            </Button>
          </form>

          {/* Register link */}
          <p className="text-center text-sm text-[#6e7977]">
            Belum punya akun?{' '}
            <Link to="/auth/daftar" className="text-[#0f766e] font-semibold hover:underline">
              Daftar Sekarang
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-xs text-[#bdc9c6]">
            © 2026 Pemerintah Kabupaten Mamberamo Raya
          </p>
        </motion.div>
      </div>
    </div>
  )
}
