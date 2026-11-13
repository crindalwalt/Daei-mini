import React from 'react'
import { CheckCircle2, MoonStar, Sparkles } from 'lucide-react'
import { Logo } from './Logo'
import { MosqueIllustration, StarPattern } from '../shared/MosqueIllustration'

interface AuthLayoutProps {
  title: string
  subtitle: string
  badge?: string
  children: React.ReactNode
  footer?: React.ReactNode
  adminMode?: boolean
}

const highlights = [
  'Plan prayer, habits and goals in one calm workspace',
  'Track daily reports with clear, honest progress scores',
  'Stay consistent with gentle reminders and streaks',
]

export function AuthLayout({
  title,
  subtitle,
  badge,
  children,
  footer,
  adminMode = false,
}: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-800 p-10 text-white lg:flex lg:flex-col xl:p-14">
        <div className="pattern-dots absolute inset-0 opacity-40" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-400/20 blur-3xl" />
        <StarPattern className="absolute right-10 top-24 h-40 w-40 text-brand-200" />
        <MosqueIllustration className="pointer-events-none absolute -bottom-2 left-0 w-full text-brand-200/70" />

        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="light" />
          {adminMode && (
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-50">
              Admin portal
            </span>
          )}
        </div>

        <div className="relative z-10 mt-20 max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-50">
            <MoonStar className="h-3.5 w-3.5" />
            Daily deen, made gentle
          </div>
          <h2 className="text-balance text-4xl font-bold leading-tight tracking-tight xl:text-[42px]">
            Build a rhythm of worship, growth and reflection.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-brand-100/90">
            Daei Mini brings your prayers, activities, habits, goals and daily reports into one
            focused space so you can keep moving forward, one day at a time.
          </p>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-brand-50/95">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-auto rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <p className="text-sm leading-relaxed text-brand-50">
            “The most beloved deeds to Allah are those done consistently, even if they are small.”
          </p>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-brand-200">
            A reminder to keep going
          </p>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center bg-[#f6f8f7] px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
          </div>

          <div className="mb-7">
            {badge && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                <Sparkles className="h-3 w-3" />
                {badge}
              </span>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{subtitle}</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card sm:p-7">
            {children}
          </div>

          {footer && <div className="mt-5 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
