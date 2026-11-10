import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Library,
  ListChecks,
  Moon,
  Repeat,
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
    title: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
      { label: 'Analytics', to: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Manage',
    items: [
      { label: 'Users', to: '/admin/users', icon: Users },
      { label: 'Groups', to: '/admin/groups', icon: UsersRound },
      { label: 'Activities', to: '/admin/activities', icon: Activity },
      { label: 'Daily Reports', to: '/admin/reports', icon: ClipboardList },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications', to: '/admin/notifications', icon: Bell },
      { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],
  },
]

export const userNav: NavSection[] = [
  {
    title: 'Today',
    items: [
      { label: 'Dashboard', to: '/app', icon: LayoutDashboard, end: true },
      { label: 'Calendar & Planner', to: '/app/calendar', icon: CalendarDays },
      { label: 'Daily Schedule', to: '/app/schedule', icon: ListChecks },
      { label: 'Activities', to: '/app/activities', icon: Activity },
    ],
  },
  {
    title: 'Growth',
    items: [
      { label: 'Prayer & Worship', to: '/app/prayer', icon: Moon },
      { label: 'Habits', to: '/app/habits', icon: Repeat },
      { label: 'Goals', to: '/app/goals', icon: Target },
      { label: 'Journal', to: '/app/journal', icon: BookOpen },
    ],
  },
  {
    title: 'Records',
    items: [
      { label: 'Daily Reports', to: '/app/reports', icon: ClipboardList },
      { label: 'Digital Library', to: '/app/library', icon: Library },
      { label: 'Health & Fitness', to: '/app/health', icon: HeartPulse },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Notifications', to: '/app/notifications', icon: Bell },
      { label: 'Settings', to: '/app/settings', icon: Settings },
    ],
  },
]
