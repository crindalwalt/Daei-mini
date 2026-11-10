import { cn } from '../../lib/utils'

/**
 * Decorative mosque skyline used as a background accent on welcome banners.
 * Purely presentational and hidden from assistive technology.
 */
export function MosqueIllustration({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 420 220"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g opacity="0.16" fill="currentColor">
        <path d="M0 220c0-52 42-94 94-94 20 0 38 6 53 16V96c0-19 15-34 34-34s34 15 34 34v46c15-10 33-16 53-16 52 0 94 42 94 94H0Z" />
        <ellipse cx="181" cy="84" rx="46" ry="44" />
        <path d="M181 40c-4-9-4-17 0-26 4 9 4 17 0 26Z" />
        <rect x="22" y="92" width="20" height="128" rx="10" />
        <path d="M32 58c-6 10-6 20 0 30 6-10 6-20 0-30Z" />
        <rect x="378" y="92" width="20" height="128" rx="10" />
        <path d="M388 58c-6 10-6 20 0 30 6-10 6-20 0-30Z" />
        <rect x="112" y="126" width="26" height="94" rx="13" />
        <path d="M125 92c-7 12-7 24 0 36 7-12 7-24 0-36Z" />
        <rect x="224" y="126" width="26" height="94" rx="13" />
        <path d="M237 92c-7 12-7 24 0 36 7-12 7-24 0-36Z" />
      </g>
      <g opacity="0.24" stroke="currentColor" strokeWidth="2" fill="none">
        <path d="M126 156c8-22 18-33 30-33s22 11 30 33" />
        <path d="M241 156c8-22 18-33 30-33s22 11 30 33" />
      </g>
    </svg>
  )
}

export function StarPattern({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g stroke="currentColor" strokeWidth="1.4" opacity="0.35">
        <path d="M60 8 70 34l27 2-21 17 7 26-23-14-23 14 7-26L23 36l27-2 10-26Z" />
        <circle cx="60" cy="60" r="52" strokeDasharray="3 6" />
      </g>
    </svg>
  )
}
