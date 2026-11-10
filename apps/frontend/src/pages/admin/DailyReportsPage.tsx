import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Flag,
  MessageSquare,
  Search,
  Star,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { ReportStatusBadge, ScoreBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminReports } from '../../lib/mockData'
import { formatDate } from '../../lib/format'

export function DailyReportsPage() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('')

  const filtered = useMemo(
    () =>
      adminReports.filter((report) => {
        const matchesSearch =
          !search ||
          (report.user_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
          (report.summary ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesStatus = status === 'all' || report.status === status
        const matchesDate = !date || report.report_date === date
        return matchesSearch && matchesStatus && matchesDate
      }),
    [search, status, date]
  )

  const stats = useMemo(() => {
    const scored = adminReports.filter((report) => (report.scheduled_count ?? 0) > 0)
    const average =
      scored.length === 0
        ? 0
        : scored.reduce((sum, report) => sum + (report.calculated_score ?? 0), 0) / scored.length
    return {
      average: average.toFixed(1),
      submitted: adminReports.filter((report) => report.status === 'submitted').length,
      reviewed: adminReports.filter((report) => report.status === 'reviewed').length,
      flagged: adminReports.filter((report) => report.status === 'flagged').length,
    }
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Daily reports"
        description="Read submissions, review scores and leave feedback for members."
        actions={
          <Button variant="outline" size="sm" onClick={() => toast.info('Preparing the report export…')}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Average score" value={`${stats.average}%`} icon={Star} hint="across scored reports" />
        <StatCard label="Submitted" value={stats.submitted} icon={ClipboardList} accent="sky" hint="awaiting review" />
        <StatCard label="Reviewed" value={stats.reviewed} icon={CheckCircle2} accent="emerald" hint="completed" />
        <StatCard label="Flagged" value={stats.flagged} icon={Flag} accent="amber" hint="follow up needed" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by member or summary…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search reports"
              />
            </div>
            <div className="flex flex-wrap gap-2">
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
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Filter by date"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No reports found"
              description="Try a different date, status or search term."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatus('all')
                    setDate('')
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
                  <TableHead>Member</TableHead>
                  <TableHead>Report date</TableHead>
                  <TableHead>Activities</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Comments</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={report.user_name ?? 'Member'} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800">{report.user_name}</p>
                          <p className="truncate text-xs text-slate-500">{report.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(report.report_date)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      <span className="font-semibold text-slate-800">{report.completed_count ?? 0}</span> /{' '}
                      {report.scheduled_count ?? 0}
                    </TableCell>
                    <TableCell><ScoreBadge score={report.calculated_score} /></TableCell>
                    <TableCell><ReportStatusBadge status={report.status} /></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <MessageSquare className="h-3.5 w-3.5" />
                        {report.comments_count ?? 0}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link to={`/admin/reports/${report.id}`}>
                        <Button variant="soft" size="sm">Review</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-slate-400">
            Showing {filtered.length} of {adminReports.length} reports. Reports for previous days are
            locked after submission.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
