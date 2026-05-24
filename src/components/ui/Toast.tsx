import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'

const icons = {
  success: <CheckCircle size={18} className="text-[#16a34a]" />,
  error:   <XCircle size={18} className="text-[#ba1a1a]" />,
  warning: <AlertTriangle size={18} className="text-[#d97706]" />,
  info:    <Info size={18} className="text-[#2563eb]" />,
}

const styles = {
  success: 'border-l-4 border-l-[#16a34a] bg-white',
  error:   'border-l-4 border-l-[#ba1a1a] bg-white',
  warning: 'border-l-4 border-l-[#d97706] bg-white',
  info:    'border-l-4 border-l-[#2563eb] bg-white',
}

export function ToastContainer() {
  const { toasts, removeToast } = useUIStore()

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-[12px] px-4 py-3.5 shadow-[0_8px_24px_rgba(0,0,0,0.14)] min-w-[280px] max-w-sm',
              styles[toast.type]
            )}
          >
            <span className="flex-shrink-0 mt-0.5">{icons[toast.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#181c1c]">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-[#6e7977] mt-0.5">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-[#6e7977] hover:text-[#181c1c] transition-colors"
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
