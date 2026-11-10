import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Search,
  XCircle,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import {
  ActivityStatusBadge,
  ActivityTypeBadge,
} from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { BarChart } from '../../components/charts/Charts'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminActivities, adminUsers, weeklyActivity } from '../../lib/mockData'
import { formatDate, formatTime } from '../../lib/format'
import type { Activity, ActivityType } from '../../types/domain'

const typeOptions: { value: ActivityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'quran', label: 'Quran' },
  { value: 'tafseer', label: 'Tafseer' },
  { value: 'reading', label: 'Reading' },
  { value: 'habit', label: 'Habit' },
  { value: 'goal', label: 'Goal' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

export function ActivitiesOverviewPage() {
  const toast = useToast()
  const [activities, setActivities] = useState<Activity[]>(adminActivities)
  const [search, setSearch] = useState('')
  const [type, setType] = useState<ActivityType | 'all'>('all')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(
    () =>
      activities.filter((activity) => {
        const member = adminUsers.find((user) => user.id === activity.user_id)
        const matchesSearch =
          !search ||
          activity.title.toLowerCase().includes(search.toLowerCase()) ||
          (member?.name ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesType = type === 'all' || activity.activity_type === type
        const matchesStatus = status === 'all' || activity.status === status
        return matchesSearch && matchesType && matchesStatus
      }),
    [activities, search, type, status]
  )

  const counts = useMemo(
    () => ({
      total: activities.length,
      completed: activities.filter((activity) => activity.status === 'completed').length,
      pending: activities.filter((activity) => activity.status === 'pending').length,
      missed: activities.filter((activity) => activity.status === 'missed').length,
    }),
    [activities]
  )

  const completeActivity = (activity: Activity) => {
    setActivities((current) =>
      current.map((item) =>
        item.id === activity.id ? { ...item, status: 'completed' } : item
      )
    )
    toast.success(`“${activity.title}” marked as completed.`)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Activities overview"
        description="Every scheduled activity across the community, in one place."
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.info('Activity export is being prepared.')}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total activities" value={counts.total} icon={ActivityIcon} hint="this period" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCircle2} accent="emerald" hint="on schedule" />
        <StatCard label="Pending" value={counts.pending} icon={Clock3} accent="sky" hint="still upcoming" />
        <StatCard label="Missed" value={counts.missed} icon={XCircle} accent="amber" hint="needs follow-up" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly activity volume</CardTitle>
          <p className="text-sm text-slate-500">Completed vs missed across the last seven days</p>
        </CardHeader>
        <CardContent>
          <BarChart data={weeklyActivity} height={190} showLegend />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search activities or members…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search activities"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-40"
                value={type}
                onChange={(event) => setType(event.target.value as ActivityType | 'all')}
                options={typeOptions}
                aria-label="Filter by activity type"
              />
              <Select
                containerClassName="w-36"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </Select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activities match your filters"
              description="Clear the filters or search for something else."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setType('all')
                    setStatus('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((activity) => {
                  const member = adminUsers.find((user) => user.id === activity.user_id)
                  return (
                    <TableRow key={activity.id}>
                      <TableCell>
                        <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                        {activity.description && (
                          <p className="max-w-[220px] truncate text-xs text-slate-500">{activity.description}</p>
                        )}
                      </TableCell>
                      <TableCell><ActivityTypeBadge type={activity.activity_type} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {member?.name ?? 'Community member'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(activity.scheduled_date)}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-slate-400">
                          {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
                        </span>
                      </TableCell>
                      <TableCell><ActivityStatusBadge status={activity.status} /></TableCell>
                      <TableCell className="text-right">
                        {activity.status === 'pending' ? (
                          <Button variant="soft" size="sm" onClick={() => completeActivity(activity)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Complete
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
