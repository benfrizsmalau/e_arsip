import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Clock, FolderOpen, Mail, Settings,
  Smartphone, LogOut, ChevronLeft, ChevronRight,
  BookOpen, Building2, Users, BarChart3, ShieldCheck,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { signOut } from '@/lib/auth'

// ─── Menu SKPD (staf / agendaris / admin) ────────────────────────────────────
const skpdNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/surat',     icon: Mail,            label: 'Registrasi Surat' },
  { to: '/arsip',     icon: FolderOpen,      label: 'Pemberkasan Arsip' },
  { to: '/jra',       icon: Clock,           label: 'Jadwal Retensi Arsip' },
]

const skpdAdminNav = [
  { to: '/pengaturan', icon: Settings,   label: 'Pengaturan OPD' },
  { to: '/mobile',     icon: Smartphone, label: 'Aplikasi Mobile' },
]

// ─── Menu Superadmin (Dinas Kearsipan) ───────────────────────────────────────
const superadminNav = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard Kabupaten' },
  { to: '/admin/opd',       icon: Building2,       label: 'Manajemen OPD' },
  { to: '/admin/users',     icon: Users,           label: 'Manajemen User' },
  { to: '/jra',             icon: Clock,           label: 'Klasifikasi & JRA' },
  { to: '/admin/laporan',   icon: BarChart3,       label: 'Laporan Lintas SKPD' },
]

const superadminSystemNav = [
  { to: '/admin/pengaturan', icon: ShieldCheck, label: 'Pengaturan Sistem' },
]

export function Sidebar() {
  const { karyawan, profile } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  const name          = karyawan?.nama ?? 'Administrator'
  const isSuperadmin  = profile?.hak === 'superadmin'
  const isAdmin       = profile?.hak === 'admin'
  const instansiNama    = karyawan?.instansi?.nama ?? null
  const instansiLabel = isSuperadmin
    ? 'Sistem Kabupaten'
    : (karyawan?.instansi?.singkatan ?? 'Mamberamo Raya')

  return (
    <motion.aside
      animate={{ width: sidebarCollapsed ? 72 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 h-screen bg-white border-r border-[#e5e9e7] flex flex-col z-40 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-[#e5e9e7] min-h-[65px]">
        <div className={cn(
          'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0',
          isSuperadmin
            ? 'bg-gradient-to-br from-[#904d00] to-[#fe932c]'
            : 'bg-gradient-to-br from-[#005c55] to-[#0f766e]'
        )}>
          <BookOpen size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'font-bold text-base leading-tight whitespace-nowrap',
                  isSuperadmin ? 'text-[#904d00]' : 'text-[#005c55]'
                )}
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                E-Arsip
              </div>
              <div className="text-[10px] text-[#6e7977] font-medium whitespace-nowrap" title={instansiNama ?? undefined}>
                {isSuperadmin ? 'Admin Kabupaten' : instansiLabel}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav — Superadmin */}
      {isSuperadmin && (
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {superadminNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
          <SectionDivider label="Sistem" collapsed={sidebarCollapsed} />
          {superadminSystemNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}
        </nav>
      )}

      {/* Nav — SKPD */}
      {!isSuperadmin && (
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {skpdNav.map((item) => (
            <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
          ))}

          {isAdmin && (
            <>
              <SectionDivider label="Administrasi" collapsed={sidebarCollapsed} />
              {skpdAdminNav.map((item) => (
                <NavItem key={item.to} {...item} collapsed={sidebarCollapsed} />
              ))}
            </>
          )}

          {!isAdmin && (
            <>
              <SectionDivider label="" collapsed={sidebarCollapsed} />
              <NavItem to="/mobile" icon={Smartphone} label="Aplikasi Mobile" collapsed={sidebarCollapsed} />
            </>
          )}
        </nav>
      )}

      {/* User footer */}
      <div className="p-3 border-t border-[#e5e9e7]">
        <div className={cn(
          'flex items-center gap-3 p-2.5 rounded-[10px]',
          isSuperadmin ? 'bg-[#fff7ed]' : 'bg-[#f1f4f3]',
          sidebarCollapsed && 'justify-center'
        )}>
          <div className={cn(
            'w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0',
            isSuperadmin ? 'bg-[#fe932c]' : 'bg-[#0f766e]'
          )}>
            {getInitials(name)}
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <div className="text-xs font-semibold text-[#181c1c] truncate">{name}</div>
                <div className="text-[10px] text-[#6e7977] truncate capitalize">
                  {profile?.hak ?? 'staf'}
                  {!isSuperadmin && instansiLabel !== 'Mamberamo Raya' && (
                    <span className="text-[#bdc9c6]"> · {instansiLabel}</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={signOut}
                className="text-[#6e7977] hover:text-[#ba1a1a] transition-colors flex-shrink-0"
                title="Keluar"
              >
                <LogOut size={15} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-[72px] w-6 h-6 rounded-full border border-[#e5e9e7] bg-white flex items-center justify-center text-[#6e7977] hover:text-[#005c55] hover:border-[#0f766e] transition-all shadow-sm z-50"
      >
        {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="h-px bg-[#e5e9e7] mx-2 my-3" />
  return (
    <div className="mt-4 mb-1 px-3">
      <span className="text-[10px] font-bold text-[#6e7977] uppercase tracking-widest">
        {label}
      </span>
    </div>
  )
}

function NavItem({
  to,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150 group',
          isActive
            ? 'bg-[#0f766e] text-white shadow-sm'
            : 'text-[#3e4947] hover:bg-[#ebefed] hover:text-[#005c55]',
          collapsed && 'justify-center px-0'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={18}
            className={cn(
              'flex-shrink-0 transition-colors',
              isActive ? 'text-white' : 'text-[#6e7977] group-hover:text-[#005c55]'
            )}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.12 }}
                className="truncate"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>
        </>
      )}
    </NavLink>
  )
}
