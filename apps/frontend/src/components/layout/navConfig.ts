import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  ListChecks,
  Settings,
  Target,
  Users,
  UsersRound,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
  badge?: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const adminNav: NavSection[] = [
  {
    title: 'Navigation',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Users Management', to: '/admin/users', icon: Users },
      { label: 'Groups Management', to: '/admin/groups', icon: UsersRound },
      { label: 'Activities Overview', to: '/admin/activities', icon: CalendarDays },
      { label: 'Reports', to: '/admin/reports', icon: ClipboardList },
      { label: 'Analytics & Progress', to: '/admin/analytics', icon: BarChart3 },
      { label: 'Notifications', to: '/admin/notifications', icon: Bell },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
]

export const userNav: NavSection[] = [
  {
    title: 'Navigation',
    items: [
      { label: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true },
      { label: 'Calendar & Planner', to: '/app/calendar', icon: CalendarDays },
      { label: 'Activities', to: '/app/activities', icon: ListChecks },
      { label: 'Habits', to: '/app/habits', icon: Target },
      { label: 'Goals', to: '/app/goals', icon: Target },
      { label: 'Reports', to: '/app/reports', icon: ClipboardList },
      { label: 'Library', to: '/app/library', icon: BookOpen },
      { label: 'Health & Fitness', to: '/app/health', icon: HeartPulse },
      { label: 'Self-Assessment', to: '/app/journal', icon: ClipboardList },
      { label: 'Settings', to: '/app/settings', icon: Settings },
    ],
  },
]
