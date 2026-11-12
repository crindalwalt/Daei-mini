import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity as ActivityIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { formatDate, formatTime } from '../../lib/format'
import type { Activity } from '../../types/domain'

const PAGE_SIZE = 10

const typeOptions = [
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

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function ActivitiesOverviewPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)

  const filters = {
    q: debouncedSearch || undefined,
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
  }

  const activitiesQuery = useQuery({
    queryKey: ['admin', 'activities', debouncedSearch, type, status, page],
    queryFn: () => adminApi.activities.list({ ...filters, page, per_page: PAGE_SIZE }),
    staleTime: 20_000,
  })

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
    staleTime: 60_000,
  })

  const activities: Activity[] = activitiesQuery.data?.items ?? []
  const stats = activitiesQuery.data?.stats ?? { total: 0, completed: 0, pending: 0, missed: 0 }
  const meta = activitiesQuery.data?.meta
  const currentPage = meta?.current_page ?? page
  const totalPages = Math.max(1, meta?.last_page ?? 1)
  const weekly = dashboardQuery.data?.charts.weekly ?? []

  const completeActivity = useMutation({
    mutationFn: (activity: Activity) => adminApi.activities.complete(activity.id),
    onSuccess: (activity) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'activities'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
      toast.success(`“${activity.title}” marked as completed.`)
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the activity.'), 'Update failed')
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await adminApi.activities.export(filters)
      toast.success('The activities CSV has been downloaded.')
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export activities.'), 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setType('all')
    setStatus('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Activities overview"
        description="Every scheduled activity across the community, in one place."
        actions={
          <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total activities" value={stats.total} icon={ActivityIcon} hint="all time" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} accent="emerald" hint="on schedule" />
        <StatCard label="Pending" value={stats.pending} icon={Clock3} accent="sky" hint="still upcoming" />
        <StatCard label="Missed" value={stats.missed} icon={XCircle} accent="amber" hint="needs follow-up" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly activity volume</CardTitle>
          <p className="text-sm text-slate-500">Completed vs missed across the last seven days</p>
        </CardHeader>
        <CardContent>
          {weekly.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No activity data yet.</div>
          ) : (
            <BarChart data={weekly} height={190} showLegend />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search activities or members…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search activities"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-40"
                value={type}
                onChange={(event) => {
                  setType(event.target.value)
                  setPage(1)
                }}
                options={typeOptions}
                aria-label="Filter by activity type"
              />
              <Select
                containerClassName="w-36"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="missed">Missed</option>
              </Select>
            </div>
          </div>

          {activitiesQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading activities…</div>
          ) : activitiesQuery.isError ? (
            <EmptyState
              icon={ActivityIcon}
              title="Could not load activities"
              description={errorMessage(activitiesQuery.error, 'The activities list is unavailable right now.')}
              action={<Button variant="outline" size="sm" onClick={() => void activitiesQuery.refetch()}>Try again</Button>}
            />
          ) : activities.length === 0 ? (
            <EmptyState
              icon={ActivityIcon}
              title="No activities match your filters"
              description="Clear the filters or search for something else."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
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
                {activities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                      {activity.description && (
                        <p className="max-w-[220px] truncate text-xs text-slate-500">{activity.description}</p>
                      )}
                    </TableCell>
                    <TableCell><ActivityTypeBadge type={activity.activity_type} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      <p className="font-medium text-slate-700">{activity.user_name ?? 'Community member'}</p>
                      {activity.user_email && (
                        <p className="text-[10px] text-slate-400">{activity.user_email}</p>
                      )}
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
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => completeActivity.mutate(activity)}
                          isLoading={completeActivity.isPending && completeActivity.variables?.id === activity.id}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Complete
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <p>
              Showing {activities.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + activities.length} of {meta?.total ?? activities.length} activities
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || activitiesQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages || activitiesQuery.isFetching}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
