import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { cn } from '../../lib/utils'

interface AppShellProps {
  variant: 'admin' | 'user'
}

const COLLAPSE_KEY = 'daei.sidebar.collapsed'

export function AppShell({ variant }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const isAdminDashboard =
    variant === 'admin' &&
    (location.pathname === '/admin' || location.pathname === '/admin/dashboard')
  const isUserDashboard =
    variant === 'user' &&
    (location.pathname === '/app' || location.pathname === '/app/dashboard' || location.pathname === '/user/dashboard')

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0')
    } catch {
      // ignore storage failures
    }
  }, [collapsed])

  return (
    <div
      className={cn(
        'min-h-screen',
        isAdminDashboard ? 'admin-dashboard bg-[#F0F0E0]' : isUserDashboard ? 'user-dashboard bg-[#F7F6EF]' : 'bg-[#f6f8f7]'
      )}
    >
      <Sidebar
        variant={variant}
        dashboard={isAdminDashboard || isUserDashboard}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div
        className="flex min-h-screen flex-col transition-[padding] duration-300"
        style={{ paddingLeft: undefined }}
      >
        <div className={collapsed ? 'lg:pl-[84px]' : 'lg:pl-[270px]'}>
          <Topbar
            variant={variant}
            dashboard={isAdminDashboard || isUserDashboard}
            onMenu={() => setMobileOpen(true)}
          />
          <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </main>
          <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 pt-2 text-center text-xs text-slate-400 sm:px-6 lg:px-8">
            Daei Mini · Built for consistent daily worship, habits and reflection.
          </footer>
        </div>
      </div>
    </div>
  )
}
