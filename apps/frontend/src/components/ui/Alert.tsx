import React from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'destructive'
  title?: string
}

export function Alert({ variant = 'info', title, children, className, ...props }: AlertProps) {
  const icons = {
    info: <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
    destructive: <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
  }

  const variantStyles = {
    info: 'bg-sky-50 border-sky-200 text-sky-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    destructive: 'bg-red-50 border-red-200 text-red-900',
  }

  return (
    <div
      role="alert"
      className={cn('flex gap-3 rounded-xl border p-4 text-sm', variantStyles[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-1">
        {title && <h5 className="font-semibold leading-none">{title}</h5>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  )
}
