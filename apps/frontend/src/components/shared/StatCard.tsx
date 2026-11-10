import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down'
  hint?: string
  icon?: LucideIcon
  iconClassName?: string
  accent?: 'brand' | 'amber' | 'sky' | 'rose' | 'emerald'
  className?: string
}

const accentStyles = {
  brand: 'bg-brand-50 text-brand-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
}

export function StatCard({
  label,
  value,
  change,
  trend = 'up',
  hint,
  icon: Icon,
  iconClassName,
  accent = 'brand',
  className,
}: StatCardProps) {
  const positive = trend === 'up'
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft transition-shadow hover:shadow-card',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <div className={cn('rounded-xl p-2.5', accentStyles[accent], iconClassName)}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      {(typeof change === 'number' || hint) && (
        <div className="mt-4 flex items-center gap-2 text-xs">
          {typeof change === 'number' && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
          <span className="text-slate-400">{hint || 'vs last month'}</span>
        </div>
      )}
    </div>
  )
}
