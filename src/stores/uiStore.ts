import { create } from 'zustand'

interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
}

interface UIState {
  sidebarCollapsed: boolean
  toasts: Toast[]

  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: false,
  toasts: [],

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }))
    setTimeout(() => get().removeToast(id), 4000)
  },

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const addToast = useUIStore((s) => s.addToast)
  return {
    toast: addToast,
    success: (title: string, description?: string) => addToast({ title, description, type: 'success' }),
    error: (title: string, description?: string) => addToast({ title, description, type: 'error' }),
    warning: (title: string, description?: string) => addToast({ title, description, type: 'warning' }),
    info: (title: string, description?: string) => addToast({ title, description, type: 'info' }),
  }
}
