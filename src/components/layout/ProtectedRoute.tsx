import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7faf8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-[#0f766e] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[#6e7977]">Memuat...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />
  }

  return <Outlet />
}
