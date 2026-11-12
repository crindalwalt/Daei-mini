import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Circle,
  Dumbbell,
  Moon,
  Repeat,
  Target,
  User as UserIcon,
} from 'lucide-react'
import { Badge } from '../ui/Badge'
import type { ActivityStatus, ActivityType, GoalStatus, UserStatus } from '../../types/domain'

export function UserStatusBadge({ status }: { status: UserStatus }) {
  const map = {
    active: { variant: 'success' as const, label: 'Active' },
    pending: { variant: 'warning' as const, label: 'Pending' },
    inactive: { variant: 'secondary' as const, label: 'Inactive' },
    suspended: { variant: 'destructive' as const, label: 'Suspended' },
  }
  const meta = map[status]
  return (
    <Badge variant={meta.variant} dot>
      {meta.label}
    </Badge>
  )
}

export function ActivityStatusBadge({ status }: { status: ActivityStatus }) {
  const map = {
    completed: { variant: 'success' as const, label: 'Completed' },
    pending: { variant: 'info' as const, label: 'Pending' },
    missed: { variant: 'destructive' as const, label: 'Missed' },
  }
  const meta = map[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function ReportStatusBadge({ status }: { status?: string }) {
  const map: Record<string, { variant: 'success' | 'warning' | 'destructive' | 'secondary'; label: string }> = {
    submitted: { variant: 'secondary', label: 'Submitted' },
    reviewed: { variant: 'success', label: 'Reviewed' },
    flagged: { variant: 'destructive', label: 'Flagged' },
  }
  const meta = map[status ?? 'submitted'] ?? map.submitted
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function GoalStatusBadge({ status }: { status: GoalStatus }) {
  const map: Record<GoalStatus, { variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'info'; label: string }> = {
    not_started: { variant: 'secondary', label: 'Not started' },
    in_progress: { variant: 'info', label: 'In progress' },
    completed: { variant: 'success', label: 'Completed' },
    paused: { variant: 'warning', label: 'Paused' },
  }
  const meta = map[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function ScoreBadge({ score, label }: { score?: number; label?: boolean }) {
  const value = score ?? 0
  const variant = value >= 80 ? 'success' : value >= 50 ? 'warning' : 'destructive'
  return (
    <Badge variant={variant}>
      {value.toFixed(2)}%{label ? ' score' : ''}
    </Badge>
  )
}

const activityTypes: Record<ActivityType, { label: string; icon: LucideIcon; className: string }> = {
  prayer: { label: 'Prayer', icon: Moon, className: 'bg-brand-50 text-brand-700' },
  quran: { label: 'Quran', icon: BookOpen, className: 'bg-emerald-50 text-emerald-700' },
  tafseer: { label: 'Tafseer', icon: BookOpen, className: 'bg-teal-50 text-teal-700' },
  reading: { label: 'Reading', icon: BookOpen, className: 'bg-sky-50 text-sky-700' },
  habit: { label: 'Habit', icon: Repeat, className: 'bg-amber-50 text-amber-700' },
  goal: { label: 'Goal', icon: Target, className: 'bg-violet-50 text-violet-700' },
  exercise: { label: 'Exercise', icon: Dumbbell, className: 'bg-rose-50 text-rose-700' },
  personal: { label: 'Personal', icon: UserIcon, className: 'bg-slate-100 text-slate-600' },
  other: { label: 'Other', icon: Circle, className: 'bg-slate-100 text-slate-600' },
}

export function activityTypeMeta(type: ActivityType) {
  return activityTypes[type] ?? activityTypes.other
}

export function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const meta = activityTypes[type] ?? activityTypes.other
  const Icon = meta.icon
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  )
}
