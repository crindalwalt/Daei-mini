import { cn } from '../../lib/utils'

export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
}

interface ProgressDonutProps {
  completed?: number
  pending?: number
  missed?: number
  size?: number
  strokeWidth?: number
  centerLabel?: string
  centerSublabel?: string
  className?: string
  showLegend?: boolean
}

export function ProgressDonut({
  completed = 78,
  pending = 14,
  missed = 8,
  size = 150,
  strokeWidth = 14,
  centerLabel,
  centerSublabel = 'Overall',
  className,
  showLegend = true,
}: ProgressDonutProps) {
  const total = Math.max(1, completed + pending + missed)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const segments: DonutSegment[] = [
    { key: 'completed', label: 'Completed', value: completed, color: '#106030' },
    { key: 'pending', label: 'Pending', value: pending, color: '#E99532' },
    { key: 'missed', label: 'Missed', value: missed, color: '#E3483E' },
  ]

  let accumulatedPercent = 0
  const renderedSegments = segments.map((seg) => {
    const percent = seg.value / total
    const strokeDasharray = `${percent * circumference} ${circumference}`
    const strokeDashoffset = -(accumulatedPercent * circumference)
    accumulatedPercent += percent

    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90 transform"
          aria-hidden="true"
        >
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#E8EEDD"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {renderedSegments.map((seg) => (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={seg.strokeDasharray}
              strokeDashoffset={seg.strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-sans text-[28px] font-bold tracking-tight text-[#26332E]">
            {centerLabel ?? `${completed}%`}
          </span>
          {centerSublabel && (
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#77817B]">
              {centerSublabel}
            </span>
          )}
        </div>
      </div>

      {showLegend && (
        <div className="mt-5 flex w-full flex-col gap-2.5 px-4 text-xs">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-center justify-between text-slate-700">
              <span className="inline-flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden="true"
                />
                <span className="font-medium text-[#26332E]">{seg.label}</span>
              </span>
              <span className="font-bold tabular-nums text-[#26332E]">{seg.value}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
