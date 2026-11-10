import React from 'react'
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/utils'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  title?: string
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant, title?: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
  dismiss: (id: number) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const styles = {
  success: 'border-emerald-200 bg-white text-emerald-900',
  error: 'border-red-200 bg-white text-red-900',
  info: 'border-sky-200 bg-white text-sky-900',
  warning: 'border-amber-200 bg-white text-amber-900',
}

const iconStyles = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-sky-500',
  warning: 'text-amber-500',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([])
  const counter = React.useRef(0)

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const toast = React.useCallback(
    (message: string, variant: ToastVariant = 'info', title?: string) => {
      const id = ++counter.current
      setToasts((current) => [...current.slice(-3), { id, message, variant, title }])
      window.setTimeout(() => dismiss(id), 4500)
    },
    [dismiss]
  )

  const value = React.useMemo<ToastContextType>(
    () => ({
      toast,
      success: (message, title) => toast(message, 'success', title),
      error: (message, title) => toast(message, 'error', title),
      info: (message, title) => toast(message, 'info', title),
      dismiss,
    }),
    [toast, dismiss]
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 top-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5"
      >
        {toasts.map((item) => {
          const Icon = icons[item.variant]
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                'pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-float animate-toast-in',
                styles[item.variant]
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', iconStyles[item.variant])} />
              <div className="min-w-0 flex-1">
                {item.title && <p className="text-sm font-semibold">{item.title}</p>}
                <p className="text-sm opacity-90">{item.message}</p>
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextType {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}
