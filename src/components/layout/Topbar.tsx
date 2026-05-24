import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, HelpCircle, Search, X, Menu } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { supabase } from '@/lib/supabase'
import type { Notifikasi } from '@/types/database'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { signOut } from '@/lib/auth'
import { cn } from '@/lib/utils'

interface TopbarProps {
  title: string
  subtitle?: string
}

export function Topbar({ title, subtitle }: TopbarProps) {
  const { karyawan, profile } = useAuthStore()
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const skpdLabel = karyawan?.instansi?.singkatan ?? null
  const [notifs, setNotifs] = useState<Notifikasi[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const unread = notifs.filter((n) => !n.dibaca).length

  useEffect(() => {
    loadNotifs()
    // Subscribe to realtime notifs
    const channel = supabase
      .channel('notifikasi')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifikasi' }, () => {
        loadNotifs()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadNotifs() {
    const { data } = await supabase
      .from('notifikasi')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setNotifs(data)
  }

  async function markAllRead() {
    await supabase.from('notifikasi').update({ dibaca: true }).eq('dibaca', false)
    setNotifs((prev) => prev.map((n) => ({ ...n, dibaca: true })))
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e5e9e7] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between px-6 py-3 gap-4">

        {/* Left */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={toggleSidebar}
            className="text-[#6e7977] hover:text-[#005c55] transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>
          <div className="min-w-0">
            <h1
              className="font-semibold text-[#181c1c] text-lg leading-tight truncate"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              {title}
            </h1>
            {subtitle && <p className="text-xs text-[#6e7977] truncate">{subtitle}</p>}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 flex-shrink-0">

          {/* Search trigger */}
          <button className="flex items-center gap-2 text-[#6e7977] hover:text-[#005c55] text-xs border border-[#e5e9e7] rounded-[8px] px-3 py-1.5 bg-[#f7faf8] hover:bg-[#f0fdfa] transition-all hidden sm:flex">
            <Search size={13} />
            <span>Cari arsip...</span>
            <kbd className="text-[10px] bg-[#e5e9e7] px-1.5 py-0.5 rounded-[4px] font-mono">⌘K</kbd>
          </button>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => { setShowNotifs((v) => !v); setShowProfile(false) }}
              className="relative w-9 h-9 flex items-center justify-center rounded-[9px] hover:bg-[#f1f4f3] transition-colors text-[#6e7977]"
            >
              <Bell size={18} />
              {unread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 bg-[#ba1a1a] text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                >
                  {unread > 9 ? '9+' : unread}
                </motion.span>
              )}
            </button>

            <AnimatePresence>
              {showNotifs && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-[14px] border border-[#e5e9e7] shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden z-50"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[#e5e9e7]">
                    <span className="font-semibold text-sm text-[#181c1c]">Notifikasi</span>
                    {unread > 0 && (
                      <button onClick={markAllRead} className="text-xs text-[#0f766e] hover:underline font-medium">
                        Tandai dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifs.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell size={24} className="mx-auto text-[#bdc9c6] mb-2" />
                        <p className="text-sm text-[#6e7977]">Tidak ada notifikasi</p>
                      </div>
                    ) : notifs.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 border-b border-[#f1f4f3] last:border-0 hover:bg-[#f7faf8] cursor-pointer transition-colors',
                          !n.dibaca && 'bg-[#f0fdfa]'
                        )}
                      >
                        <div className={cn(
                          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                          n.tipe === 'success' && 'bg-[#16a34a]',
                          n.tipe === 'warning' && 'bg-[#d97706]',
                          n.tipe === 'error' && 'bg-[#ba1a1a]',
                          n.tipe === 'info' && 'bg-[#2563eb]',
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#181c1c]">{n.judul}</p>
                          <p className="text-xs text-[#6e7977] mt-0.5">{n.pesan}</p>
                          <p className="text-[10px] text-[#bdc9c6] mt-1">{formatRelativeTime(n.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Help */}
          <button className="w-9 h-9 flex items-center justify-center rounded-[9px] hover:bg-[#f1f4f3] transition-colors text-[#6e7977]">
            <HelpCircle size={18} />
          </button>

          {/* User profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => { setShowProfile((v) => !v); setShowNotifs(false) }}
              className="flex items-center gap-2.5 p-1.5 rounded-[10px] hover:bg-[#f1f4f3] transition-colors"
            >
              <Avatar name={karyawan?.nama} src={karyawan?.foto_url} size="sm" />
              <div className="hidden sm:block text-left">
                <div className="text-xs font-semibold text-[#181c1c] leading-tight max-w-[120px] truncate">
                  {karyawan?.nama?.split(' ')[0] ?? 'User'}
                </div>
                <div className="text-[10px] text-[#6e7977] leading-tight capitalize flex items-center gap-1">
                  <span>{profile?.hak ?? 'staf'}</span>
                  {skpdLabel && (
                    <>
                      <span className="text-[#cbd5e1]">·</span>
                      <span className="font-medium text-[#0f766e] uppercase tracking-wide">{skpdLabel}</span>
                    </>
                  )}
                </div>
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="absolute right-0 mt-2 w-56 bg-white rounded-[14px] border border-[#e5e9e7] shadow-[0_16px_48px_rgba(0,0,0,0.14)] overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-[#e5e9e7] bg-[#f7faf8]">
                    <p className="text-sm font-semibold text-[#181c1c] truncate">{karyawan?.nama ?? 'User'}</p>
                    <p className="text-xs text-[#6e7977]">{karyawan?.nip ?? '-'}</p>
                    {skpdLabel && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold text-[#0f766e] bg-[#ccfbf1] px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {skpdLabel}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#ba1a1a] hover:bg-[#ffdad6]/30 transition-colors font-medium"
                  >
                    <span>Keluar</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}
