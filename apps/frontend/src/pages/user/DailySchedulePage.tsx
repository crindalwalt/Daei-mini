import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Sun,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Progress } from '../../components/ui/Progress'
import { Select } from '../../components/ui/Select'
import { ActivityStatusBadge, ActivityTypeBadge } from '../../components/shared/StatusBadge'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { todaySchedule } from '../../lib/mockData'
import { formatDate, formatTime, todayISO } from '../../lib/format'
import type { Activity } from '../../types/domain'
import { cn } from '../../lib/utils'

export function DailySchedulePage() {
  const toast = useToast()
  const [activities, setActivities] = useState<Activity[]>(todaySchedule)
  const [filter, setFilter] = useState('all')

  const completed = activities.filter((activity) => activity.status === 'completed').length
  const completion = Math.round((completed / activities.length) * 100)

  const filtered = useMemo(
    () =>
      activities.filter((activity) => (filter === 'all' ? true : activity.status === filter)),
    [activities, filter]
  )

  const toggleComplete = (activity: Activity) => {
    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id
          ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed' }
          : item
      )
    )
    toast.success(
      activity.status === 'completed'
        ? `“${activity.title}” moved back to pending.`
        : `“${activity.title}” marked complete.`
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Today"
        title="Daily schedule"
        description="A clear timeline of today's activities, prayers and personal blocks."
        actions={
          <Link to="/app/activities/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add activity
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Scheduled"
          value={activities.length}
          icon={CalendarDays}
          hint={formatDate(todayISO())}
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={CheckCircle2}
          accent="emerald"
          hint={`${activities.length - completed} remaining`}
        />
        <StatCard label="Completion" value={`${completion}%`} icon={Sun} accent="amber" hint="today" />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Timeline</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              {completed} of {activities.length} activities completed
            </p>
          </div>
          <Select
            containerClassName="w-40"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            aria-label="Filter activities"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="missed">Missed</option>
          </Select>
        </CardHeader>
        <CardContent>
          <div className="mb-5">
            <Progress value={completion} showLabel />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                No activities match this filter.
              </p>
            ) : (
              filtered.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    'flex flex-col gap-3 rounded-xl border p-4 transition-colors sm:flex-row sm:items-center',
                    activity.status === 'completed'
                      ? 'border-emerald-100 bg-emerald-50/40'
                      : 'border-slate-100 hover:bg-slate-50/60'
                  )}
                >
                  <div className="flex w-full items-center gap-3 sm:w-auto">
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-sm font-bold text-slate-800">
                        {formatTime(activity.start_time)}
                      </p>
                      {activity.end_time && (
                        <p className="text-[10px] text-slate-400">{formatTime(activity.end_time)}</p>
                      )}
                    </div>
                    <div
                      className={cn(
                        'h-10 w-1 shrink-0 rounded-full',
                        activity.status === 'completed'
                          ? 'bg-emerald-400'
                          : activity.status === 'missed'
                            ? 'bg-red-300'
                            : 'bg-brand-200'
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                      <ActivityTypeBadge type={activity.activity_type} />
                      <ActivityStatusBadge status={activity.status} />
                    </div>
                    {activity.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{activity.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activity.reminder_enabled && (
                      <Badge variant="outline">
                        <Clock3 className="mr-1 h-3 w-3" />
                        Reminder
                      </Badge>
                    )}
                    <Button
                      variant={activity.status === 'completed' ? 'outline' : 'soft'}
                      size="sm"
                      onClick={() => toggleComplete(activity)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {activity.status === 'completed' ? 'Undo' : 'Complete'}
                    </Button>
                    <Link to={`/app/activities/${activity.id}/edit`}>
                      <Button variant="ghost" size="icon" aria-label="Edit activity">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
