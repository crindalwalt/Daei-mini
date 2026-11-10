import { cn } from '../../lib/utils'

interface LogoProps {
  compact?: boolean
  variant?: 'light' | 'dark'
  className?: string
}

export function Logo({ compact = false, variant = 'dark', className }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M12 2.5c2.8 0 5 2.2 5 5 0 1.5-.7 2.9-1.8 3.8V18h-6.4V11.3A4.98 4.98 0 0 1 7 7.5c0-2.8 2.2-5 5-5Z"
            fill="currentColor"
            opacity="0.95"
          />
          <path
            d="M10.2 18v2.2M13.8 18v2.2M8.4 21.5h7.2M5 9.5v9.2M19 9.5v9.2M4 19h2M18 19h2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M12 .9v1.2M9.6 2l.6 1M14.4 2l-.6 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              'text-[17px] font-bold tracking-tight',
              variant === 'dark' ? 'text-slate-900' : 'text-white'
            )}
          >
            Daei Mini
          </span>
          <span
            className={cn(
              'mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
              variant === 'dark' ? 'text-brand-600' : 'text-brand-100'
            )}
          >
            Daily Deen
          </span>
        </span>
      )}
    </div>
  )
}
