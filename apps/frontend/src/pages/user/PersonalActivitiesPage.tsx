import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity as ActivityIcon,
  CalendarDays,
  CheckCircle2,
  Filter,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { ActivityStatusBadge, ActivityTypeBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { todaySchedule } from '../../lib/mockData'
import { formatDate, formatTime } from '../../lib/format'
import type { Activity } from '../../types/domain'

const seedActivities: Activity[] = [
  ...todaySchedule,
  {
    id: 201,
    title: 'Weekly planning session',
    description: 'Review goals and set the week ahead',
    activity_type: 'personal',
    scheduled_date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    start_time: '18:00',
    end_time: '18:45',
    status: 'pending',
    reminder_enabled: true,
  },
  {
    id: 202,
    title: 'Read 20 pages',
    description: 'Continue the current book',
    activity_type: 'reading',
    scheduled_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    start_time: '21:00',
    end_time: '21:45',
    status: 'completed',
    reminder_enabled: false,
  },
]

export function PersonalActivitiesPage() {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')

  const filtered = useMemo(
    () =>
      seedActivities.filter((activity) => {
        const matchesSearch =
          !search ||
          activity.title.toLowerCase().includes(search.toLowerCase()) ||
          (activity.description ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesType = type === 'all' || activity.activity_type === type
        const matchesStatus = status === 'all' || activity.status === status
        return matchesSearch && matchesType && matchesStatus
      }),
    [search, type, status]
  )

  const counts = useMemo(
    () => ({
      total: seedActivities.length,
      completed: seedActivities.filter((activity) => activity.status === 'completed').length,
      pending: seedActivities.filter((activity) => activity.status === 'pending').length,
    }),
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Today"
        title="Personal activities"
        description="Your own scheduled activities, separate from shared group timetables."
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
        <StatCard label="All activities" value={counts.total} icon={ActivityIcon} hint="in your plan" />
        <StatCard
          label="Completed"
          value={counts.completed}
          icon={CheckCircle2}
          accent="emerald"
          hint="all time"
        />
        <StatCard
          label="Pending"
          value={counts.pending}
          icon={CalendarDays}
          accent="amber"
          hint="still to do"
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0">
          <CardTitle>All personal activities</CardTitle>
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Filter className="h-3.5 w-3.5" />
            {filtered.length} results
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your activities…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search activities"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-40"
                value={type}
                onChange={(event) => setType(event.target.value)}
                aria-label="Filter by type"
              >
                <option value="all">All types</option>
                <option value="prayer">Prayer</option>
                <option value="quran">Quran</option>
                <option value="reading">Reading</option>
                <option value="exercise">Exercise</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </Select>
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
              title="No activities found"
              description="Adjust your filters or add a new activity."
              action={
                <Link to="/app/activities/new">
                  <Button size="sm">
                    <Plus className="h-4 w-4" />
                    Add activity
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                      {activity.description && (
                        <p className="max-w-[260px] truncate text-xs text-slate-500">
                          {activity.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <ActivityTypeBadge type={activity.activity_type} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(activity.scheduled_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatTime(activity.start_time)}
                    </TableCell>
                    <TableCell>
                      <ActivityStatusBadge status={activity.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/app/activities/${activity.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
