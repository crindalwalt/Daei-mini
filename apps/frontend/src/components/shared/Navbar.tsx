import { Link } from 'react-router-dom'
import { LogOut, Layers, ShieldCheck, User as UserIcon } from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'

export function Navbar() {
  const { user, logout } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-bold text-slate-900 tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <span>ThinkCode</span>
          <Badge variant="secondary" className="hidden sm:inline-flex text-[10px] ml-1">
            Starter Template
          </Badge>
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sanctum SPA Session</span>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-700">
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                <UserIcon className="w-4 h-4" />
              </div>
              <span className="font-medium hidden sm:inline">{user.name}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => logout()}
              title="Sign out"
              className="text-slate-600 hover:text-red-600 hover:border-red-200"
            >
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
