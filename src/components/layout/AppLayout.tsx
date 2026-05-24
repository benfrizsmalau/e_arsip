import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { ToastContainer } from '@/components/ui/Toast'
import { useUIStore } from '@/stores/uiStore'

const pageMeta: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard':   { title: 'Dashboard', subtitle: 'Ringkasan sistem kearsipan daerah' },
  '/jra':         { title: 'Jadwal Retensi Arsip', subtitle: 'Kelola jadwal retensi dan masa simpan arsip' },
  '/arsip':       { title: 'Pemberkasan Arsip', subtitle: 'Input dan kelola metadata dokumen arsip' },
  '/surat':       { title: 'Registrasi Surat', subtitle: 'Pencatatan surat masuk dan surat keluar' },
  '/pengaturan':  { title: 'Pengaturan Sistem', subtitle: 'Konfigurasi instansi, OPD, dan keamanan' },
  '/mobile':      { title: 'Aplikasi Mobile Pimpinan', subtitle: 'Preview tampilan mobile untuk eksekutif' },
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15 } },
}

export function AppLayout() {
  const { sidebarCollapsed } = useUIStore()
  const location = useLocation()
  const meta = pageMeta[location.pathname] ?? { title: 'E-Arsip', subtitle: undefined }

  return (
    <div className="flex min-h-screen bg-[#f7faf8]">
      <Sidebar />
      <motion.div
        animate={{ marginLeft: sidebarCollapsed ? 72 : 256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-1 flex flex-col min-w-0"
      >
        <Topbar title={meta.title} subtitle={meta.subtitle} />
        <AnimatePresence mode="wait">
          <motion.main
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex-1 p-6"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>
      </motion.div>
      <ToastContainer />
    </div>
  )
}
