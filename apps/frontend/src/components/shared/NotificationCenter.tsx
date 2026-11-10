import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  ClipboardList,
  Moon,
  Repeat,
  Settings,
  Target,
  Trash2,
} from 'lucide-react'
import { PageHeader } from './PageHeader'
import { EmptyState } from './EmptyState'
import { Card, CardContent } from '../ui/Card'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { Badge } from '../ui/Badge'
import { useToast } from '../ui/toast/ToastProvider'
import { relativeTime } from '../../lib/format'
import type { NotificationItem } from '../../types/domain'
import { cn } from '../../lib/utils'

const typeMeta: Record<
  NotificationItem['type'],
  { label: string; icon: LucideIcon; className: string }
> = {
  activity: { label: 'Activity', icon: Activity, className: 'bg-sky-50 text-sky-600' },
  report: { label: 'Report', icon: ClipboardList, className: 'bg-brand-50 text-brand-600' },
  habit: { label: 'Habit', icon: Repeat, className: 'bg-amber-50 text-amber-600' },
  goal: { label: 'Goal', icon: Target, className: 'bg-violet-50 text-violet-600' },
  system: { label: 'System', icon: Settings, className: 'bg-slate-100 text-slate-500' },
  prayer: { label: 'Prayer', icon: Moon, className: 'bg-emerald-50 text-emerald-600' },
}

interface NotificationCenterProps {
  eyebrow: string
  title: string
  description: string
  initialNotifications: NotificationItem[]
}

export function NotificationCenter({
  eyebrow,
  title,
  description,
  initialNotifications,
}: NotificationCenterProps) {
  const toast = useToast()
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications)
  const [filter, setFilter] = useState('all')

  const unread = notifications.filter((item) => !item.read).length

  const filtered = useMemo(
    () =>
      notifications.filter((item) => {
        if (filter === 'all') return true
        if (filter === 'unread') return !item.read
        return item.type === filter
      }),
    [notifications, filter]
  )

  const markRead = (id: number) => {
    setNotifications((current) =>
      current.map((item) => (item.id === id ? { ...item, read: true } : item))
    )
  }

  const markAllRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    toast.success('All notifications marked as read.')
  }

  const remove = (id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id))
    toast.info('Notification removed.')
  }

  const clearRead = () => {
    const removed = notifications.filter((item) => item.read).length
    setNotifications((current) => current.filter((item) => !item.read))
    toast.info(`${removed} read notification${removed === 1 ? '' : 's'} cleared.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={clearRead} disabled={unread === notifications.length}>
              <Trash2 className="h-4 w-4" />
              Clear read
            </Button>
            <Button size="sm" onClick={markAllRead} disabled={unread === 0}>
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { id: 'all', label: 'All', count: notifications.length },
            { id: 'unread', label: 'Unread', count: unread },
            { id: 'report', label: 'Reports' },
            { id: 'activity', label: 'Activities' },
            { id: 'system', label: 'System' },
          ]}
        />
        <p className="text-xs text-slate-400">
          {unread} unread of {notifications.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="You're all caught up"
          description="New notifications will appear here as activity happens."
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-slate-100 p-0">
            {filtered.map((item) => {
              const meta = typeMeta[item.type]
              const Icon = meta.icon
              return (
                <div
                  key={item.id}
                  className={cn(
                    'group flex items-start gap-3.5 p-4 transition-colors sm:p-5',
                    !item.read ? 'bg-brand-50/40' : 'bg-white'
                  )}
                >
                  <span className={cn('rounded-xl p-2.5', meta.className)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                      {!item.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-label="Unread" />
                      )}
                      <Badge variant="outline" className="ml-auto">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.message}</p>
                    <p className="mt-1.5 text-[11px] text-slate-400">{relativeTime(item.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {!item.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markRead(item.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <CheckCircle2 className="h-4 w-4 text-slate-400" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(item.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                    >
                      <Trash2 className="h-4 w-4 text-slate-300 group-hover:text-red-400" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-soft">
        <Bell className="h-4 w-4 text-brand-500" />
        Notifications are delivered in-app. Manage delivery preferences in Settings.
      </div>
    </div>
  )
}
