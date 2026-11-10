import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ClipboardList,
  Plus,
  Search,
  Star,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { ReportStatusBadge, ScoreBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { LineChart } from '../../components/charts/Charts'
import { userReports } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import type { ChartPoint } from '../../types/domain'

export function ReportHistoryPage() {
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(
    () =>
      userReports.filter((report) => {
        const matchesStatus = status === 'all' || report.status === status
        const matchesSearch =
          !search || (report.summary ?? '').toLowerCase().includes(search.toLowerCase())
        return matchesStatus && matchesSearch
      }),
    [status, search]
  )

  const stats = useMemo(() => {
    const scored = userReports.filter((report) => (report.scheduled_count ?? 0) > 0)
    const average =
      scored.length === 0
        ? 0
        : scored.reduce((sum, report) => sum + (report.calculated_score ?? 0), 0) / scored.length
    return {
      average: average.toFixed(1),
      submitted: userReports.length,
      best: Math.max(...userReports.map((report) => report.calculated_score ?? 0)),
    }
  }, [])

  const trend: ChartPoint[] = useMemo(
    () =>
      [...userReports]
        .reverse()
        .map((report) => ({
          label: formatDate(report.report_date, { day: '2-digit', month: 'short' }),
          value: report.calculated_score ?? 0,
        })),
    []
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Report history"
        description="Review your submitted daily reports, scores and administrator feedback."
        actions={
          <Link to="/app/reports/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New report
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Reports submitted" value={stats.submitted} icon={ClipboardList} hint="all time" />
        <StatCard
          label="Average score"
          value={`${stats.average}%`}
          icon={TrendingUp}
          accent="emerald"
          hint="excluding zero-activity days"
        />
        <StatCard
          label="Best score"
          value={`${stats.best.toFixed(0)}%`}
          icon={Star}
          accent="amber"
          hint="personal best"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Score trend</CardTitle>
          <p className="text-sm text-slate-500">Your last {userReports.length} daily reports</p>
        </CardHeader>
        <CardContent>
          <LineChart data={trend} height={180} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search your reports…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search reports"
              />
            </div>
            <Select
              containerClassName="w-40"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="flagged">Flagged</option>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No reports found"
              description="Try a different filter or write your first report."
              action={
                <Link to="/app/reports/new">
                  <Button size="sm">Write a report</Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => {
                  const zero = (report.scheduled_count ?? 0) === 0
                  return (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDate(report.report_date)}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[280px] truncate text-sm text-slate-700">
                          {report.summary}
                        </p>
                        {zero && (
                          <p className="mt-0.5 text-[10px] font-medium text-amber-600">
                            Zero activities scheduled — score is exactly 0.00%
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {report.completed_count ?? 0} / {report.scheduled_count ?? 0}
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={report.calculated_score} />
                      </TableCell>
                      <TableCell>
                        <ReportStatusBadge status={report.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/app/reports/${report.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
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
