import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../features/auth/useAuth'
import { useToast } from '../ui/toast/ToastProvider'
import { Avatar } from '../ui/Avatar'
import { adminNav, userNav } from './navConfig'

interface TopbarProps {
  variant: 'admin' | 'user'
  onMenu: () => void
}

export function Topbar({ variant, onMenu }: TopbarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const sections = variant === 'admin' ? adminNav : userNav
  const links = sections.flatMap((section) =>
    section.items.map((item) => ({ ...item, section: section.title }))
  )
  const results = query
    ? links.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : []

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('You have been signed out.')
    } catch {
      toast.error('Could not reach the server, but you have been signed out locally.')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchOpen(true)
            }}
            onFocus={() => setSearchOpen(true)}
            onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
            placeholder={variant === 'admin' ? 'Search users, groups, reports…' : 'Search your activities and pages…'}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100"
            aria-label="Search"
          />
          {searchOpen && results.length > 0 && (
            <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
              {results.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.to}
                    type="button"
                    onClick={() => {
                      navigate(item.to)
                      setQuery('')
                      setSearchOpen(false)
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Icon className="h-4 w-4 text-slate-400" />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      {item.section}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <span className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            All systems operational
          </span>

          <Link
            to={variant === 'admin' ? '/admin/notifications' : '/app/notifications'}
            className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white" />
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1 pr-2.5 transition-colors hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user?.name ?? 'Guest User'} size="sm" />
              <span className="hidden max-w-[120px] truncate text-sm font-semibold text-slate-700 md:block">
                {user?.name ?? 'Guest'}
              </span>
              <ChevronDown
                className={cn(
                  'hidden h-3.5 w-3.5 text-slate-400 transition-transform md:block',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card"
              >
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {user?.name ?? 'Guest User'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{user?.email ?? 'Not signed in'}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
                    <ShieldCheck className="h-3 w-3" />
                    {variant === 'admin' ? 'Administrator' : 'Member'}
                  </span>
                </div>
                <div className="p-1.5">
                  <Link
                    to={variant === 'admin' ? '/admin/settings' : '/app/settings'}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    role="menuitem"
                  >
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    Profile
                  </Link>
                  <Link
                    to={variant === 'admin' ? '/admin/settings' : '/app/settings'}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    role="menuitem"
                  >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
