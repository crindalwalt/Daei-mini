import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, ShieldCheck, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../features/auth/useAuth'
import { useToast } from '../ui/toast/ToastProvider'
import { adminNav, userNav, type NavSection } from './navConfig'
import { Logo } from './Logo'
import { Avatar } from '../ui/Avatar'
import { MosqueIllustration } from '../shared/MosqueIllustration'

interface SidebarProps {
  variant: 'admin' | 'user'
  dashboard?: boolean
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  variant,
  dashboard = false,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [loggingOut, setLoggingOut] = useState(false)
  const sections: NavSection[] = variant === 'admin' ? adminNav : userNav

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      toast.success('You have been signed out.')
    } catch {
      toast.error('Could not reach the server, but you have been signed out locally.')
    } finally {
      setLoggingOut(false)
      onCloseMobile()
      navigate('/login', { replace: true })
    }
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-slate-200/80 bg-white transition-all duration-300',
          dashboard && 'admin-sidebar-dashboard',
          collapsed ? 'lg:w-[84px]' : 'lg:w-[270px]',
          'w-[270px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center border-b border-slate-100 px-4',
            collapsed ? 'lg:justify-center lg:px-0' : 'justify-between'
          )}
        >
          <Logo
            compact={collapsed}
            subtitle={variant === 'admin' ? 'ADMIN APP' : 'USER PORTAL'}
          />
          <button
            type="button"
            onClick={onCloseMobile}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin">
          {sections.map((section) => (
            <div key={section.title} className="mb-4">
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                          collapsed && 'lg:justify-center lg:px-0',
                          isActive
                            ? variant === 'admin'
                              ? 'bg-[#106030] text-white shadow-xs'
                              : 'bg-[#12683D] text-white shadow-xs'
                            : 'text-[#26332E]/80 hover:bg-[#E0F0E0]/60 hover:text-[#106030]'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0 transition-colors',
                              isActive ? 'text-white' : 'text-slate-500 group-hover:text-[#106030]'
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/70" />
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {!collapsed && (
          <div className="dash-side-art mx-3 mb-2">
            <div className="dash-side-art__pattern" aria-hidden="true" />
            <MosqueIllustration className="dash-side-art__mosque" />
          </div>
        )}

        <div className="border-t border-slate-100 p-3">
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl px-2 py-2',
              collapsed && 'lg:justify-center lg:px-0'
            )}
          >
            <Avatar name={user?.name ?? 'Guest User'} size="sm" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">
                  {user?.name ?? 'Guest User'}
                </p>
                <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                  {variant === 'admin' && <ShieldCheck className="h-3 w-3 text-brand-600" />}
                  {variant === 'admin' ? 'Administrator' : 'Member'}
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className={cn(
              'mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-[#E3483E] shadow-2xs transition-colors hover:border-red-200 hover:bg-red-50/80 disabled:opacity-60',
              collapsed && 'lg:justify-center lg:px-0'
            )}
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>{loggingOut ? 'Signing out…' : 'Logout'}</span>}
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'mt-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600',
              collapsed && 'lg:justify-center lg:px-0'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <>
                <ChevronLeft className="h-3.5 w-3.5" />
                Collapse menu
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
