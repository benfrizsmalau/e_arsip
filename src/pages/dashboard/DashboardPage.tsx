import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  FolderArchive, TrendingUp, Shield, Clock, Activity,
  Upload, ArrowRight, FileText, Mail,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatRelativeTime } from '@/lib/utils'
import type { Arsip } from '@/types/database'

interface Stats {
  totalArsip: number
  arsipAktif: number
  arsipVital: number
  uploadBulanIni: number
}

interface MonthlyPoint { bulan: string; arsip: number }
interface StatusPoint  { name: string; value: number; fill: string }
interface OPDPoint     { opd: string; arsip: number; fill: string }

const STATUS_COLORS: Record<string, string> = {
  aktif: '#0f766e', inaktif: '#bdc9c6', vital: '#fe932c',
  permanen: '#2563eb', musnah: '#ba1a1a', draft: '#6e7977',
}

const OPD_FILLS = ['#0f766e','#14b8a6','#0d9488','#5eead4','#99f6e4']

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 20 } },
}

export default function DashboardPage() {
  const { karyawan } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ totalArsip: 0, arsipAktif: 0, arsipVital: 0, uploadBulanIni: 0 })
  const [recentArsip, setRecentArsip]     = useState<Arsip[]>([])
  const [monthlyData, setMonthlyData]     = useState<MonthlyPoint[]>([])
  const [statusData, setStatusData]       = useState<StatusPoint[]>([])
  const [opdData, setOPDData]             = useState<OPDPoint[]>([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const [
        { data: recentData },
        { count: total },
        { count: aktif },
        { count: vital },
        { count: bulanIni },
        { data: allArsip },
      ] = await Promise.all([
        supabase.from('arsip').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('arsip').select('*', { count: 'exact', head: true }),
        supabase.from('arsip').select('*', { count: 'exact', head: true }).eq('status', 'aktif'),
        supabase.from('arsip').select('*', { count: 'exact', head: true }).eq('status', 'vital'),
        supabase.from('arsip').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
        supabase.from('arsip').select('status, pengirim, created_at'),
      ])

      setStats({
        totalArsip:    total        ?? 0,
        arsipAktif:    aktif        ?? 0,
        arsipVital:    vital        ?? 0,
        uploadBulanIni: bulanIni    ?? 0,
      })

      if (recentData) setRecentArsip(recentData)

      if (allArsip && allArsip.length > 0) {
        // Monthly chart — last 6 months
        const monthMap: Record<string, number> = {}
        const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          monthMap[`${d.getFullYear()}-${d.getMonth()}`] = 0
        }
        allArsip.forEach((a) => {
          const d = new Date(a.created_at)
          const key = `${d.getFullYear()}-${d.getMonth()}`
          if (key in monthMap) monthMap[key]++
        })
        setMonthlyData(
          Object.entries(monthMap).map(([key, count]) => {
            const [y, m] = key.split('-').map(Number)
            return { bulan: `${MONTHS[m]} ${String(y).slice(2)}`, arsip: count }
          })
        )

        // Status pie chart
        const statusCount: Record<string, number> = {}
        allArsip.forEach((a) => { statusCount[a.status] = (statusCount[a.status] ?? 0) + 1 })
        setStatusData(
          Object.entries(statusCount).map(([name, value]) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            fill: STATUS_COLORS[name] ?? '#6e7977',
          }))
        )

        // OPD bar chart — top 5 by pengirim
        const opdCount: Record<string, number> = {}
        allArsip.forEach((a) => {
          if (a.pengirim) opdCount[a.pengirim] = (opdCount[a.pengirim] ?? 0) + 1
        })
        const sorted = Object.entries(opdCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([opd, arsip], i) => ({ opd: opd.length > 10 ? opd.slice(0, 10) + '…' : opd, arsip, fill: OPD_FILLS[i] }))
        setOPDData(sorted)
      }
    } finally {
      setLoading(false)
    }
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 11) return 'Selamat pagi'
    if (h < 15) return 'Selamat siang'
    if (h < 18) return 'Selamat sore'
    return 'Selamat malam'
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        variants={cardVariants}
        className="rounded-[16px] p-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #005c55 0%, #0f766e 60%, #0d9488 100%)' }}
      >
        <div className="relative z-10">
          <p className="text-white/70 text-sm">{greeting()},</p>
          <h2 className="text-white text-xl font-bold mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
            {karyawan?.nama?.split(' ').slice(0, 2).join(' ') ?? 'Administrator'} 👋
          </h2>
          <p className="text-white/60 text-xs mt-1">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-3 relative z-10">
          <Link to="/arsip">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight size={14} />}
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:border-white/50 hover:text-white">
              Input Arsip Baru
            </Button>
          </Link>
        </div>
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -right-4 -bottom-12 w-64 h-64 rounded-full bg-white/5" />
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<FolderArchive size={20} />}
          label="Total Arsip"
          value={stats.totalArsip.toLocaleString('id-ID')}
          delta="Total keseluruhan"
          deltaType="success"
          iconBg="bg-[#f0fdfa]"
          iconColor="text-[#0f766e]"
        />
        <KPICard
          icon={<TrendingUp size={20} />}
          label="Arsip Aktif"
          value={stats.arsipAktif.toLocaleString('id-ID')}
          delta={stats.totalArsip > 0 ? `${Math.round((stats.arsipAktif / stats.totalArsip) * 100)}% dari total` : '0% dari total'}
          deltaType="info"
          iconBg="bg-[#dbeafe]"
          iconColor="text-[#2563eb]"
          progress={stats.totalArsip > 0 ? (stats.arsipAktif / stats.totalArsip) * 100 : 0}
        />
        <KPICard
          icon={<Shield size={20} />}
          label="Arsip Vital"
          value={stats.arsipVital.toLocaleString('id-ID')}
          delta="Rahasia & Vital"
          deltaType="warning"
          iconBg="bg-[#fef3c7]"
          iconColor="text-[#d97706]"
        />
        <KPICard
          icon={<Upload size={20} />}
          label="Upload Bulan Ini"
          value={stats.uploadBulanIni.toLocaleString('id-ID')}
          delta="Bulan berjalan"
          deltaType="neutral"
          iconBg="bg-[#f3e8ff]"
          iconColor="text-[#7c3aed]"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Area Chart */}
        <Card className="lg:col-span-2" padding="md">
          <CardHeader>
            <CardTitle>Tren Penambahan Arsip (6 Bulan)</CardTitle>
            <Badge variant="primary" size="sm">Bulanan</Badge>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorArsip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f766e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f4f3" />
                  <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#6e7977' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6e7977' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5e9e7', fontSize: 12 }} cursor={{ stroke: '#e5e9e7' }} />
                  <Area type="monotone" dataKey="arsip" stroke="#0f766e" strokeWidth={2} fill="url(#colorArsip)" name="Arsip" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={220} label="Belum ada data arsip" />
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card padding="md">
          <CardHeader><CardTitle>Status Arsip</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e5e9e7' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {statusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: item.fill }} />
                        <span className="text-[#6e7977]">{item.name}</span>
                      </div>
                      <span className="font-semibold text-[#181c1c]">{item.value.toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyChart height={180} label="Belum ada data" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* OPD Bar Chart */}
        <Card padding="md">
          <CardHeader>
            <CardTitle>Arsip per Pengirim</CardTitle>
            <Badge variant="neutral" size="sm">Top 5</Badge>
          </CardHeader>
          <CardContent>
            {opdData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={opdData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#6e7977' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="opd" type="category" width={60} tick={{ fontSize: 10, fill: '#6e7977' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12, border: '1px solid #e5e9e7' }} />
                  <Bar dataKey="arsip" radius={[0, 6, 6, 0]} name="Arsip">
                    {opdData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart height={180} label="Belum ada data pengirim" />
            )}
          </CardContent>
        </Card>

        {/* Recent Arsip */}
        <Card padding="none" className="overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e5e9e7]">
            <CardTitle>Arsip Terbaru</CardTitle>
            <Link to="/arsip">
              <Button variant="ghost" size="xs" rightIcon={<ArrowRight size={12} />}>Lihat semua</Button>
            </Link>
          </div>
          <div className="divide-y divide-[#f1f4f3]">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 px-5 py-3.5 animate-pulse">
                  <div className="w-8 h-8 rounded-[8px] bg-[#f1f4f3] flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[#f1f4f3] rounded w-3/4" />
                    <div className="h-2.5 bg-[#f1f4f3] rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : recentArsip.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-[#6e7977]">
                <FileText size={28} className="opacity-20 mb-2" />
                <p className="text-xs">Belum ada arsip</p>
              </div>
            ) : recentArsip.map((arsip) => (
              <div key={arsip.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-[#f7faf8] transition-colors">
                <div className="w-8 h-8 rounded-[8px] bg-[#f0fdfa] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText size={14} className="text-[#0f766e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#181c1c] truncate">{arsip.judul}</p>
                  <p className="text-[11px] text-[#0f766e] font-mono">{arsip.nomor_arsip}</p>
                  <p className="text-[10px] text-[#6e7977] mt-0.5">{formatRelativeTime(arsip.created_at)}</p>
                </div>
                <Badge variant={getStatusVariant(arsip.status)} size="sm">{arsip.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card padding="sm">
            <CardTitle className="mb-3">Akses Cepat</CardTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/arsip',      icon: FolderArchive, label: 'Arsip Baru',  bg: 'bg-[#f0fdfa]', color: 'text-[#0f766e]' },
                { to: '/surat',      icon: Mail,          label: 'Surat Masuk', bg: 'bg-[#fff7ed]', color: 'text-[#ea580c]' },
                { to: '/jra',        icon: Clock,         label: 'Cek JRA',     bg: 'bg-[#fef3c7]', color: 'text-[#d97706]' },
                { to: '/pengaturan', icon: Activity,      label: 'Pengaturan',  bg: 'bg-[#dbeafe]', color: 'text-[#2563eb]' },
              ].map(({ to, icon: Icon, label, bg, color }) => (
                <Link key={to} to={to}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`${bg} rounded-[10px] p-3 flex flex-col items-center gap-1.5 cursor-pointer transition-opacity hover:opacity-80`}
                  >
                    <Icon size={18} className={color} />
                    <span className="text-xs font-semibold text-[#181c1c] text-center leading-tight">{label}</span>
                  </motion.div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyChart({ height, label }: { height: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-[#6e7977]" style={{ height }}>
      <FolderArchive size={28} className="opacity-20 mb-2" />
      <p className="text-xs">{label}</p>
    </div>
  )
}

function KPICard({ icon, label, value, delta, deltaType, iconBg, iconColor, progress }: {
  icon: React.ReactNode
  label: string
  value: string
  delta: string
  deltaType: 'success' | 'error' | 'warning' | 'info' | 'neutral'
  iconBg: string
  iconColor: string
  progress?: number
}) {
  return (
    <motion.div variants={cardVariants}>
      <Card padding="md">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-[10px] ${iconBg} flex items-center justify-center ${iconColor}`}>
            {icon}
          </div>
          <Badge variant={deltaType} size="sm">{delta}</Badge>
        </div>
        <div className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>{value}</div>
        <div className="text-xs text-[#6e7977] mt-0.5">{label}</div>
        {progress !== undefined && (
          <div className="mt-3 h-1.5 bg-[#e5e9e7] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="h-full bg-[#0f766e] rounded-full"
            />
          </div>
        )}
      </Card>
    </motion.div>
  )
}

function getStatusVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'neutral' {
  const m: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
    aktif: 'success', inaktif: 'neutral', vital: 'warning', permanen: 'info',
    musnah: 'error', draft: 'neutral',
  }
  return m[status] ?? 'neutral'
}
