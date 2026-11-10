import { NavLink } from 'react-router-dom'
import { ChevronLeft, ChevronRight, HelpCircle, LogOut, ShieldCheck, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../features/auth/useAuth'
import { adminNav, userNav, type NavSection } from './navConfig'
import { Logo } from './Logo'
import { Avatar } from '../ui/Avatar'

interface SidebarProps {
  variant: 'admin' | 'user'
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onCloseMobile: () => void
}

export function Sidebar({
  variant,
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth()
  const sections: NavSection[] = variant === 'admin' ? adminNav : userNav

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
          <Logo compact={collapsed} />
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
            <div key={section.title} className="mb-5">
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {section.title}
                </p>
              )}
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
                            ? 'bg-brand-50 text-brand-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn(
                              'h-[18px] w-[18px] shrink-0 transition-colors',
                              isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                            )}
                          />
                          {!collapsed && <span className="truncate">{item.label}</span>}
                          {!collapsed && isActive && (
                            <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
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
          <div className="mx-3 mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white">
            <div className="mb-2 flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-brand-200" />
              <p className="text-sm font-semibold">
                {variant === 'admin' ? 'Admin playbook' : 'Need a hand?'}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-brand-100/90">
              {variant === 'admin'
                ? 'Review reports daily and keep groups on track.'
                : 'Set your prayer preferences and build a routine that sticks.'}
            </p>
            <NavLink
              to={variant === 'admin' ? '/admin/settings' : '/app/settings'}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-white underline underline-offset-4 hover:text-brand-100"
            >
              {variant === 'admin' ? 'Open settings' : 'Personalise app'}
              <ChevronRight className="h-3 w-3" />
            </NavLink>
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
            {!collapsed && <LogOut className="h-4 w-4 text-slate-300" aria-hidden="true" />}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={cn(
              'mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700',
              collapsed && 'lg:justify-center lg:px-0'
            )}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                Collapse menu
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
