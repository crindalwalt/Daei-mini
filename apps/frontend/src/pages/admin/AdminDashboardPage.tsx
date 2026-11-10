import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  TrendingUp,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { MosqueIllustration, StarPattern } from '../../components/shared/MosqueIllustration'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { BarChart } from '../../components/charts/Charts'
import { UserStatusBadge, ReportStatusBadge, ScoreBadge } from '../../components/shared/StatusBadge'
import { activityOverview, adminReports, adminStats, adminUsers, weeklyActivity } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'

const statIcons = [Users, UsersRound, Activity, ClipboardList]
const statAccents = ['brand', 'sky', 'emerald', 'amber'] as const

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<'weekly' | 'monthly'>('monthly')
  const firstName = user?.name?.split(' ')[0] ?? 'Admin'
  const chartData = range === 'monthly' ? activityOverview : weeklyActivity

  const recentUsers = adminUsers.slice(0, 5)
  const recentReports = adminReports.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 p-6 text-white shadow-card sm:p-8">
        <div className="pattern-dots absolute inset-0 opacity-30" />
        <StarPattern className="absolute right-8 top-6 hidden h-32 w-32 text-brand-200/60 sm:block" />
        <MosqueIllustration className="absolute -bottom-6 right-0 hidden w-[420px] text-brand-200/50 lg:block" />
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-50">
            <CalendarDays className="h-3 w-3" />
            {formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Assalamu alaikum, {firstName}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-100/90">
            Here is how the community is progressing. 248 members across 18 groups have logged
            1,142 activities this period.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/admin/reports">
              <Button variant="secondary" className="bg-white text-brand-800 hover:bg-brand-50">
                <FileText className="h-4 w-4" />
                Review reports
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/15"
              >
                <UserPlus className="h-4 w-4" />
                Manage users
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <PageHeader
        eyebrow="Overview"
        title="Community dashboard"
        description="A snapshot of members, groups, activities and daily reports."
        actions={
          <Link to="/admin/analytics">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4" />
              Full analytics
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {adminStats.map((stat, index) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={statIcons[index]}
            accent={statAccents[index]}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Activity overview</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Completed vs missed activities</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              {(['weekly', 'monthly'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors',
                    range === option
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-600" /> Completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-brand-200" /> Missed
              </span>
              <span className="ml-auto inline-flex items-center gap-1 font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                +8.7% vs last period
              </span>
            </div>
            <BarChart data={chartData} height={250} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Completion rate</CardTitle>
            <p className="text-sm text-slate-500">Across all activities this month</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <CircularProgress value={78} size={156} strokeWidth={12} />
            <div className="mt-5 w-full space-y-3">
              {[
                { label: 'Completed', value: 890, color: 'bg-brand-600' },
                { label: 'In progress', value: 176, color: 'bg-brand-300' },
                { label: 'Missed', value: 76, color: 'bg-amber-300' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-sm">
                  <span className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
                  <span className="text-slate-500">{item.label}</span>
                  <span className="ml-auto font-semibold text-slate-800">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 w-full rounded-xl bg-brand-50 p-3 text-center text-xs font-medium text-brand-700">
              78% of all scheduled activities were completed.
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-7">
        <Card className="xl:col-span-4">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Recent users</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Latest members to join the programme</p>
            </div>
            <Link to="/admin/users" className="text-xs font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.map((member) => (
              <Link
                key={member.id}
                to={`/admin/users/${member.id}`}
                className="flex items-center gap-3 rounded-xl border border-transparent p-2 transition-colors hover:border-slate-100 hover:bg-slate-50/70"
              >
                <Avatar name={member.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                    <UserStatusBadge status={member.status} />
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {member.group ?? 'No group'} · joined {formatDate(member.joined_at)}
                  </p>
                </div>
                <div className="hidden w-28 sm:block">
                  <Progress value={member.progress ?? 0} size="sm" />
                  <p className="mt-1 text-right text-[10px] font-medium text-slate-400">
                    {member.progress ?? 0}%
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Recent reports</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Daily submissions needing review</p>
            </div>
            <Link to="/admin/reports" className="text-xs font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Link
                        to={`/admin/reports/${report.id}`}
                        className="flex items-center gap-2 font-medium text-slate-700 hover:text-brand-700"
                      >
                        <Avatar name={report.user_name ?? 'Member'} size="xs" />
                        <span className="max-w-[110px] truncate">{report.user_name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(report.report_date)}
                    </TableCell>
                    <TableCell>
                      <ScoreBadge score={report.calculated_score} />
                    </TableCell>
                    <TableCell>
                      <ReportStatusBadge status={report.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Add a new user', description: 'Invite a member and assign a group.', to: '/admin/users', icon: UserPlus },
          { label: 'Create a group', description: 'Organise members around a shared goal.', to: '/admin/groups', icon: UsersRound },
          { label: 'Review reports', description: 'Read submissions and leave feedback.', to: '/admin/reports', icon: FileText },
          { label: 'Check analytics', description: 'See completion trends and top members.', to: '/admin/analytics', icon: BarChart3 },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
            >
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{action.description}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
              </div>
            </Link>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-soft">
        <Badge variant="success" dot>
          System healthy
        </Badge>
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> 92 reports processed
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-3.5 w-3.5 text-slate-400" /> Last sync 2 minutes ago
        </span>
      </div>
    </div>
  )
}
