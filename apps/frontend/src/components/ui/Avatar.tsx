import { cn } from '../../lib/utils'

const palette = [
  'bg-brand-600',
  'bg-emerald-500',
  'bg-teal-600',
  'bg-amber-500',
  'bg-sky-600',
  'bg-rose-500',
  'bg-violet-500',
  'bg-orange-500',
]

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function colorFor(name: string) {
  const sum = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return palette[sum % palette.length]
}

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const sizes = {
    xs: 'h-6 w-6 text-[10px]',
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 text-2xl',
  }

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-white', sizes[size], className)}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-white',
        colorFor(name),
        sizes[size],
        className
      )}
    >
      {initials(name) || '?'}
    </span>
  )
}
