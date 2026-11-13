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

export function BotanicalLeaves({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 80"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g opacity="0.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 70 Q 50 40 100 50 T 190 30" />
        <path d="M40 52 C 30 35 45 25 55 35 C 65 45 50 55 40 52 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M75 48 C 70 25 90 20 95 35 C 100 50 85 55 75 48 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M115 48 C 110 28 130 22 135 38 C 140 52 125 58 115 48 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M150 40 C 150 18 170 20 172 35 C 175 48 160 52 150 40 Z" fill="currentColor" fillOpacity="0.15" />
      </g>
    </svg>
  )
}

export function MosqueLandscape({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 120"
      fill="none"
      className={cn('pointer-events-none select-none', className)}
    >
      <g opacity="0.22" fill="currentColor">
        <path d="M0 120 L0 100 Q 40 95 80 100 Q 120 105 160 98 Q 200 92 240 98 L300 100 L300 120 Z" />
        <path d="M110 98 C 110 70 150 70 150 98 Z" />
        <rect x="127" y="55" width="6" height="43" />
        <ellipse cx="130" cy="50" rx="6" ry="9" />
        <path d="M130 38 L130 42" stroke="currentColor" strokeWidth="2" />
        <rect x="75" y="65" width="10" height="35" rx="3" />
        <ellipse cx="80" cy="60" rx="7" ry="10" />
        <rect x="180" y="70" width="10" height="30" rx="3" />
        <ellipse cx="185" cy="65" rx="6" ry="9" />
      </g>
      <g opacity="0.3" stroke="currentColor" strokeWidth="1.2">
        <path d="M10 115 Q 35 105 60 115" />
        <path d="M220 115 Q 255 105 290 115" />
      </g>
    </svg>
  )
}
