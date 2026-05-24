import { motion } from 'framer-motion'
import {
  Smartphone, QrCode, Download, Archive, Mail,
  BookOpen, CheckCircle2, Star, Bell, Search,
  Home, FileText, Settings
} from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

// ─── Phone Frame ───────────────────────────────────────────────────────────────
function PhoneScreen({ screen }: { screen: 'home' | 'arsip' | 'surat' }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[44px] bg-[#f7faf8]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-6 pt-3 pb-2 bg-[#005c55]">
        <span className="text-white/90 text-[10px] font-semibold">09:41</span>
        <div className="flex gap-1">
          {[3, 2.5, 2, 1.5].map((h, i) => <div key={i} className="w-0.5 rounded-sm bg-white/80" style={{ height: `${h * 3}px` }} />)}
          <div className="w-3 h-1.5 rounded-sm border border-white/80 ml-1"><div className="h-full w-2/3 rounded-sm bg-white/80 m-px" /></div>
        </div>
      </div>

      {screen === 'home' && (
        <div className="flex flex-col h-full">
          {/* App header */}
          <div className="bg-[#005c55] px-4 pt-1 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-white/70 text-[10px]">Selamat Pagi,</p>
                <p className="text-white text-xs font-bold">Ahmad Fauzi</p>
              </div>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center relative">
                <Bell size={12} className="text-white" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#fe932c]" />
              </div>
            </div>
            {/* Search */}
            <div className="flex items-center gap-2 bg-white/15 rounded-[10px] px-3 py-1.5">
              <Search size={11} className="text-white/70" />
              <span className="text-white/50 text-[10px]">Cari arsip...</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="px-3 py-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: '14.250', icon: <Archive size={12} /> },
                { label: 'Vital',  value: '328',    icon: <Star size={12} /> },
                { label: 'Baru',   value: '12',     icon: <Mail size={12} /> },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white p-2 text-center shadow-sm border border-[#e5e9e7]">
                  <div className="flex items-center justify-center text-[#0f766e] mb-1">{s.icon}</div>
                  <p className="text-[11px] font-bold text-[#181c1c]">{s.value}</p>
                  <p className="text-[9px] text-[#6e7977]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick menu */}
          <div className="px-3">
            <p className="text-[10px] font-bold text-[#6e7977] uppercase tracking-wider mb-2">Menu Cepat</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Arsip', icon: <Archive size={16} />, color: 'bg-[#ccfbf1] text-[#0f766e]' },
                { label: 'Surat', icon: <Mail size={16} />,   color: 'bg-[#dbeafe] text-[#2563eb]' },
                { label: 'JRA',   icon: <BookOpen size={16} />, color: 'bg-[#fef3c7] text-[#d97706]' },
                { label: 'Cari',  icon: <Search size={16} />,  color: 'bg-[#ede9fe] text-[#7c3aed]' },
              ].map((m) => (
                <div key={m.label} className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${m.color}`}>{m.icon}</div>
                  <p className="text-[9px] text-[#3e4947] font-medium">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent */}
          <div className="px-3 mt-3 flex-1">
            <p className="text-[10px] font-bold text-[#6e7977] uppercase tracking-wider mb-2">Arsip Terbaru</p>
            <div className="space-y-2">
              {[
                { no: 'EA-2024-0005', judul: 'Data Kesehatan Kab. 2023', status: 'Aktif' },
                { no: 'EA-2024-0004', judul: 'Tender Jalan Trans-Mamberamo', status: 'Vital' },
              ].map((a) => (
                <div key={a.no} className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-[#e5e9e7]">
                  <div className="w-7 h-7 rounded-lg bg-[#ccfbf1] flex items-center justify-center flex-shrink-0">
                    <FileText size={12} className="text-[#0f766e]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-[#0f766e] font-mono">{a.no}</p>
                    <p className="text-[9px] text-[#181c1c] truncate">{a.judul}</p>
                  </div>
                  <span className="text-[8px] font-semibold text-[#16a34a] bg-[#dcfce7] px-1.5 py-0.5 rounded-full">{a.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom nav */}
          <div className="px-3 pb-6 pt-2">
            <div className="flex items-center justify-around bg-white rounded-2xl p-2 shadow-lg border border-[#e5e9e7]">
              {[
                { icon: <Home size={16} />, label: 'Beranda', active: true },
                { icon: <Archive size={16} />, label: 'Arsip', active: false },
                { icon: <Mail size={16} />, label: 'Surat', active: false },
                { icon: <Settings size={16} />, label: 'Setelan', active: false },
              ].map((n) => (
                <div key={n.label} className={`flex flex-col items-center gap-0.5 px-2 ${n.active ? 'text-[#0f766e]' : 'text-[#6e7977]'}`}>
                  {n.icon}
                  <span className={`text-[8px] font-semibold ${n.active ? 'text-[#0f766e]' : 'text-[#6e7977]'}`}>{n.label}</span>
                  {n.active && <div className="w-1 h-1 rounded-full bg-[#0f766e]" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[240px] h-[480px]">
      {/* Phone body */}
      <div className="absolute inset-0 bg-[#1a1a1a] rounded-[48px] shadow-2xl">
        {/* Screen bezel */}
        <div className="absolute inset-[3px] bg-black rounded-[46px]">
          {/* Screen */}
          <div className="absolute inset-[3px] rounded-[44px] overflow-hidden">
            {children}
          </div>
        </div>
        {/* Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-black rounded-full z-10" />
        {/* Side buttons */}
        <div className="absolute -right-1 top-16 w-1 h-10 bg-[#2a2a2a] rounded-r-sm" />
        <div className="absolute -left-1 top-12 w-1 h-6 bg-[#2a2a2a] rounded-l-sm" />
        <div className="absolute -left-1 top-20 w-1 h-10 bg-[#2a2a2a] rounded-l-sm" />
      </div>
    </div>
  )
}

// ─── Feature cards ─────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: <Archive size={18} />, title: 'Akses Arsip', desc: 'Lihat dan cari arsip dari mana saja secara real-time', color: 'bg-[#ccfbf1] text-[#0f766e]' },
  { icon: <Mail size={18} />, title: 'Buku Agenda', desc: 'Pantau surat masuk dan keluar terkini', color: 'bg-[#dbeafe] text-[#2563eb]' },
  { icon: <BookOpen size={18} />, title: 'Referensi JRA', desc: 'Jadwal retensi tersedia offline', color: 'bg-[#fef3c7] text-[#d97706]' },
  { icon: <Bell size={18} />, title: 'Notifikasi Push', desc: 'Terima peringatan arsip jatuh tempo', color: 'bg-[#ede9fe] text-[#7c3aed]' },
  { icon: <Search size={18} />, title: 'Pencarian Cepat', desc: 'Full-text search seluruh database arsip', color: 'bg-[#fce7f3] text-[#be185d]' },
  { icon: <CheckCircle2 size={18} />, title: 'Kerja Offline', desc: 'Fitur dasar tetap berjalan tanpa internet', color: 'bg-[#dcfce7] text-[#16a34a]' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MobilePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#181c1c]" style={{ fontFamily: 'Sora, sans-serif' }}>Aplikasi Mobile</h1>
        <p className="text-sm text-[#6e7977] mt-0.5">E-Arsip Mamberamo Raya tersedia sebagai Progressive Web App (PWA)</p>
      </div>

      {/* Hero section */}
      <Card padding="none" className="overflow-hidden">
        <div className="bg-gradient-to-br from-[#005c55] to-[#0f766e] p-8 relative overflow-hidden">
          {/* BG decoration */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5" />

          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1 text-center md:text-left">
              <Badge variant="primary" className="mb-3 bg-white/20 text-white border-0">
                <Smartphone size={11} /> PWA Ready
              </Badge>
              <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                E-Arsip di Genggaman Anda
              </h2>
              <p className="text-white/75 text-sm leading-relaxed mb-6">
                Akses, kelola, dan pantau arsip daerah kapan saja dan di mana saja.
                Install langsung dari browser tanpa perlu unduh dari app store.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
                  Install Aplikasi
                </Button>
                <Button variant="outline" size="sm" leftIcon={<QrCode size={14} />} className="border-white/30 text-white hover:bg-white/15 hover:text-white hover:border-white/50">
                  Scan QR Code
                </Button>
              </div>
            </div>

            {/* Phone mockup */}
            <div className="flex-shrink-0">
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
                whileHover={{ y: -6 }}
              >
                <PhoneFrame>
                  <PhoneScreen screen="home" />
                </PhoneFrame>
              </motion.div>
            </div>
          </div>
        </div>
      </Card>

      {/* Features */}
      <div>
        <h3 className="text-lg font-bold text-[#181c1c] mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Fitur Unggulan</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 240, damping: 24 }}
            >
              <Card hover padding="md" className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#181c1c]">{f.title}</h4>
                  <p className="text-xs text-[#6e7977] mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* PWA install guide */}
      <Card padding="md">
        <h3 className="text-sm font-bold text-[#181c1c] mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Cara Install PWA</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '1', title: 'Buka di Browser', desc: 'Akses e-arsip.mamberamoraya.go.id di browser Chrome atau Safari', icon: <Globe /> },
            { step: '2', title: 'Ketuk "Install"', desc: 'Tap ikon install di address bar atau menu browser Anda', icon: <Download /> },
            { step: '3', title: 'Siap Digunakan', desc: 'Aplikasi tersimpan di layar utama dan bisa digunakan offline', icon: <CheckCircle2 /> },
          ].map((s) => (
            <div key={s.step} className="flex flex-col items-center text-center p-4 rounded-xl bg-[#f7faf8] border border-[#e5e9e7]">
              <div className="w-10 h-10 rounded-full bg-[#0f766e] flex items-center justify-center mb-3">
                <span className="text-white font-bold text-sm">{s.step}</span>
              </div>
              <h4 className="text-sm font-bold text-[#181c1c] mb-1">{s.title}</h4>
              <p className="text-xs text-[#6e7977] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Compatibility */}
      <Card padding="md">
        <h3 className="text-sm font-bold text-[#181c1c] mb-3" style={{ fontFamily: 'Sora, sans-serif' }}>Kompatibilitas</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Chrome Android 80+', 'Safari iOS 14+', 'Firefox 85+', 'Edge 80+', 'Samsung Internet 12+'
          ].map((b) => (
            <Badge key={b} variant="neutral" size="sm">
              <CheckCircle2 size={10} className="text-[#16a34a]" /> {b}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  )
}

// Placeholder for Globe to avoid additional import
function Globe({ size = 18 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
}
