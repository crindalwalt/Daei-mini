import React from 'react'
import { cn } from '../../lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'info' | 'outline'
  dot?: boolean
}

export function Badge({
  className,
  variant = 'default',
  dot = false,
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-brand-100 text-brand-800 border-brand-200',
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    destructive: 'bg-red-100 text-red-700 border-red-200',
    secondary: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-sky-100 text-sky-800 border-sky-200',
    outline: 'bg-transparent text-slate-600 border-slate-200',
  }

  const dotStyles = {
    default: 'bg-brand-600',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    destructive: 'bg-red-500',
    secondary: 'bg-slate-400',
    info: 'bg-sky-500',
    outline: 'bg-slate-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotStyles[variant])} />}
      {children}
    </span>
  )
}
