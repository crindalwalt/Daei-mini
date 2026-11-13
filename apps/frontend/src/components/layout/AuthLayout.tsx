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
  'Plan prayer, habits and daily goals in one calm workspace',
  'Track daily reports with clear, honest progress metrics',
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
    <div className="grid min-h-screen lg:grid-cols-[1.08fr_1fr] bg-[#F7F6EF]">
      {/* Left Sidebar (Desktop presentation) */}
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#0e4c27] via-[#12683D] to-[#145C3A] p-10 text-white lg:flex lg:flex-col xl:p-14">
        {/* Decorative backgrounds */}
        <div className="pattern-dots absolute inset-0 opacity-30" />
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#309050]/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 h-80 w-80 rounded-full bg-[#E0F0E0]/15 blur-3xl pointer-events-none" />
        <StarPattern className="absolute right-12 top-20 h-40 w-40 text-[#E0F0E0]/20 pointer-events-none" />
        <StarPattern className="absolute right-36 bottom-44 h-24 w-24 text-[#E0F0E0]/15 pointer-events-none" />
        <MosqueIllustration className="pointer-events-none absolute -bottom-3 left-0 w-full text-[#E0F0E0]/25" />

        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="light" subtitle={adminMode ? 'ADMIN APP' : 'USER PORTAL'} />
          {adminMode && (
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#E0F0E0]">
              Admin Portal
            </span>
          )}
        </div>

        <div className="relative z-10 mt-16 max-w-md">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-semibold text-[#E0F0E0]">
            <MoonStar className="h-3.5 w-3.5" />
            Daily deen, made gentle
          </div>
          <h2 className="font-serif text-balance text-4xl font-bold leading-tight tracking-tight text-white xl:text-[42px]">
            Build a rhythm of worship, growth and reflection.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#E0F0E0]/90">
            Daei Mini brings your prayers, activities, habits, goals and daily reports into one
            calm, focused space so you can keep moving forward, one day at a time.
          </p>

          <ul className="mt-8 space-y-3.5">
            {highlights.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#F0F0E0]/95">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#7ae69e]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 mt-auto rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md">
          <blockquote className="font-serif italic text-sm leading-relaxed text-white">
            “The most beloved deeds to Allah are those done consistently, even if they are small.”
          </blockquote>
          <p className="mt-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#C0D0B0]">
            A reminder for daily consistency
          </p>
        </div>
      </aside>

      {/* Right Main Form Area */}
      <main className="flex min-h-screen items-center justify-center bg-[#F7F6EF] px-4 py-10 sm:px-8">
        <div className="w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo subtitle={adminMode ? 'ADMIN APP' : 'USER PORTAL'} />
            {adminMode && (
              <span className="rounded-full border border-[#D5E6D1] bg-[#E7F1E4] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#12683D]">
                Admin
              </span>
            )}
          </div>

          <div className="mb-6">
            {badge && (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#D5E6D1] bg-[#E7F1E4] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#12683D]">
                <Sparkles className="h-3 w-3" />
                {badge}
              </span>
            )}
            <h1 className="font-serif text-[28px] font-bold tracking-tight text-[#145C3A] sm:text-[32px]">
              {title}
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#77817B]">{subtitle}</p>
          </div>

          <div className="rounded-[22px] border border-[#E8E7DD] bg-white p-6 shadow-[0_4px_24px_-12px_rgba(20,92,58,0.12)] sm:p-8">
            {children}
          </div>

          {footer && <div className="mt-5 text-center text-sm text-[#77817B]">{footer}</div>}
        </div>
      </main>
    </div>
  )
}
