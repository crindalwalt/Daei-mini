import React from 'react'
import { cn } from '../../lib/utils'

interface ProgressProps {
  value: number
  className?: string
  barClassName?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  labelClassName?: string
}

export function Progress({
  value,
  className,
  barClassName,
  size = 'md',
  showLabel = false,
  labelClassName,
}: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const heights = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className={cn('mb-1 flex items-center justify-between text-xs text-slate-500', labelClassName)}>
          <span>Progress</span>
          <span className="font-semibold text-slate-700">{clamped.toFixed(0)}%</span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-slate-100', heights[size])}>
        <div
          className={cn('h-full rounded-full bg-brand-600 transition-all duration-500', barClassName)}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
  trackClassName?: string
  barClassName?: string
  children?: React.ReactNode
}

export function CircularProgress({
  value,
  size = 132,
  strokeWidth = 10,
  className,
  trackClassName,
  barClassName,
  children,
}: CircularProgressProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className={cn('stroke-slate-100', trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('stroke-brand-600 transition-all duration-700', barClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {children ?? (
          <>
            <span className="text-2xl font-bold text-slate-900">{clamped.toFixed(0)}%</span>
            <span className="text-[11px] font-medium text-slate-500">Completed</span>
          </>
        )}
      </div>
    </div>
  )
}
