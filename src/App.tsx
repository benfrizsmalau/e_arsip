import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { AuthProvider } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { ToastContainer } from '@/components/ui/Toast'

const LoginPage            = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage         = lazy(() => import('@/pages/auth/RegisterPage'))
const DashboardPage        = lazy(() => import('@/pages/dashboard/DashboardPage'))
const JRAPage              = lazy(() => import('@/pages/jra/JRAPage'))
const ArsipPage            = lazy(() => import('@/pages/arsip/ArsipPage'))
const SuratPage            = lazy(() => import('@/pages/surat/SuratPage'))
const PengaturanPage       = lazy(() => import('@/pages/pengaturan/PengaturanPage'))
const MobilePage           = lazy(() => import('@/pages/mobile/MobilePage'))
// Superadmin pages
const AdminDashboardPage   = lazy(() => import('@/pages/admin/AdminDashboardPage'))
const AdminOPDPage         = lazy(() => import('@/pages/admin/AdminOPDPage'))
const AdminUsersPage       = lazy(() => import('@/pages/admin/AdminUsersPage'))
const AdminLaporanPage     = lazy(() => import('@/pages/admin/AdminLaporanPage'))
const AdminPengaturanPage  = lazy(() => import('@/pages/admin/AdminPengaturanPage'))

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 2, retry: 1 } },
})

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-[3px] border-[#0f766e] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/auth/login"  element={<LoginPage />} />
              <Route path="/auth/daftar" element={<RegisterPage />} />
              <Route path="/"           element={<Navigate to="/auth/login" replace />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* SKPD routes */}
                  <Route path="/dashboard"  element={<DashboardPage />} />
                  <Route path="/jra"        element={<JRAPage />} />
                  <Route path="/arsip"      element={<ArsipPage />} />
                  <Route path="/surat"      element={<SuratPage />} />
                  <Route path="/pengaturan" element={<PengaturanPage />} />
                  <Route path="/mobile"     element={<MobilePage />} />
                  {/* Superadmin routes */}
                  <Route path="/admin/dashboard"  element={<AdminDashboardPage />} />
                  <Route path="/admin/opd"        element={<AdminOPDPage />} />
                  <Route path="/admin/users"      element={<AdminUsersPage />} />
                  <Route path="/admin/laporan"    element={<AdminLaporanPage />} />
                  <Route path="/admin/pengaturan" element={<AdminPengaturanPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/auth/login" replace />} />
            </Routes>
          </Suspense>
          <ToastContainer />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
