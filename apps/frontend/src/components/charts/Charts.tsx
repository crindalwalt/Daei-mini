import { cn } from '../../lib/utils'
import type { ChartPoint } from '../../types/domain'

interface BarChartProps {
  data: ChartPoint[]
  height?: number
  className?: string
  showLegend?: boolean
  showYAxis?: boolean
  valueLabel?: string
  secondaryLabel?: string
}

export function BarChart({
  data,
  height = 220,
  className,
  showLegend = false,
  showYAxis = false,
  valueLabel = 'Completed',
  secondaryLabel = 'Missed',
}: BarChartProps) {
  const max = Math.max(1, ...data.flatMap((point) => [point.value, point.secondary ?? 0]))
  const ticks = [max, Math.round(max * 0.75), Math.round(max * 0.5), Math.round(max * 0.25), 0]
  const gridLines = showYAxis ? ticks : [0, 1, 2, 3]

  return (
    <div className={cn('w-full', className)}>
      {showLegend && (
        <div className="mb-4 flex items-center gap-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> {valueLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-200" /> {secondaryLabel}
          </span>
        </div>
      )}
      <div className="flex w-full gap-2 sm:gap-3">
        {showYAxis && (
          <div className="relative w-6 shrink-0" style={{ height }}>
            {ticks.map((tick, index) => (
              <span
                key={`${tick}-${index}`}
                className="absolute right-0 -translate-y-1/2 text-[10px] font-medium tabular-nums text-slate-400"
                style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
        )}
        <div className="relative min-w-0 flex-1" style={{ height }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {gridLines.map((line, index) => (
              <div key={`${line}-${index}`} className="border-t border-dashed border-slate-100" />
            ))}
          </div>
          <div className="relative flex h-full items-end gap-2 sm:gap-4">
            {data.map((point) => {
              const primary = Math.max(2, (point.value / max) * 100)
              const secondary =
                typeof point.secondary === 'number'
                  ? Math.max(2, (point.secondary / max) * 100)
                  : null
              return (
                <div key={point.label} className="group flex h-full flex-1 flex-col justify-end">
                  <div className="relative flex flex-1 items-end justify-center gap-1">
                    <div
                      className="w-full max-w-5 rounded-t-md bg-brand-600/90 transition-all duration-500 group-hover:bg-brand-600 sm:max-w-7"
                      style={{ height: `${primary}%` }}
                      title={`${point.label}: ${point.value}`}
                    />
                    {secondary !== null && (
                      <div
                        className="w-full max-w-5 rounded-t-md bg-brand-200 transition-all duration-500 group-hover:bg-brand-300 sm:max-w-7"
                        style={{ height: `${secondary}%` }}
                        title={`${point.label}: ${point.secondary}`}
                      />
                    )}
                    <div className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                      {point.value}
                      {typeof point.secondary === 'number' ? ` / ${point.secondary}` : ''}
                    </div>
                  </div>
                  <span className="mt-2 truncate text-center text-[10px] font-medium text-slate-500 sm:text-xs">
                    {point.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

interface LineChartProps {
  data: ChartPoint[]
  height?: number
  className?: string
  color?: string
}

export function LineChart({ data, height = 180, className, color = '#1e5631' }: LineChartProps) {
  if (data.length === 0) return null
  const max = Math.max(1, ...data.map((point) => point.value))
  const min = Math.min(...data.map((point) => point.value), 0)
  const range = max - min || 1
  const points = data.map((point, index) => {
    const x = (index / Math.max(1, data.length - 1)) * 100
    const y = 100 - ((point.value - min) / range) * 88 - 6
    return { x, y, ...point }
  })
  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
  const area = `0,100 ${polyline} 100,100`

  return (
    <div className={cn('w-full', className)}>
      <div style={{ height }} className="relative">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#eef2ef"
              strokeWidth="0.6"
              strokeDasharray="2 2"
            />
          ))}
          <polygon points={area} fill="url(#line-fill)" />
          <polyline
            points={polyline}
            fill="none"
            stroke={color}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point) => (
            <circle
              key={point.label}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill="#ffffff"
              stroke={color}
              strokeWidth="1.1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400">
        {data.map((point) => (
          <span key={point.label}>{point.label}</span>
        ))}
      </div>
    </div>
  )
}
