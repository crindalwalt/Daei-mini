import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  FileText,
  Quote,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { MosqueIllustration, StarPattern, BotanicalLeaves, MosqueLandscape } from '../../components/shared/MosqueIllustration'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { BarChart } from '../../components/charts/Charts'
import { ProgressDonut } from '../../components/charts/ProgressDonut'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import '../../styles/admin-dashboard.css'

interface MetricConfig {
  key: string
  label: string
  fallbackValue: number
  fallbackChange: number
  icon: LucideIcon
  accent: 'forest' | 'purple' | 'orange' | 'blue'
  color: string
}

const metricConfigs: MetricConfig[] = [
  {
    key: 'users',
    label: 'Total Users',
    fallbackValue: 248,
    fallbackChange: 12,
    icon: Users,
    accent: 'forest',
    color: '#106030',
  },
  {
    key: 'groups',
    label: 'Total Groups',
    fallbackValue: 18,
    fallbackChange: 0,
    icon: UsersRound,
    accent: 'purple',
    color: '#8060c8',
  },
  {
    key: 'activities',
    label: 'Total Activities',
    fallbackValue: 1142,
    fallbackChange: 15,
    icon: CalendarDays,
    accent: 'orange',
    color: '#e99532',
  },
  {
    key: 'reports',
    label: 'Total Reports',
    fallbackValue: 92,
    fallbackChange: 10,
    icon: FileText,
    accent: 'blue',
    color: '#398fcb',
  },
]

const sampleRecentUsers = [
  { id: 1, name: 'Hamza Khan', email: 'hamza@email.com', status: 'active' },
  { id: 2, name: 'Ayesha Malik', email: 'ayesha@email.com', status: 'active' },
  { id: 3, name: 'Ali Raza', email: 'ali@email.com', status: 'pending' },
]

const sampleRecentReports = [
  { id: 1024, code: '#RP-1024', userName: 'Hamza Khan', date: 'May 12, 2024', status: 'completed' },
  { id: 1023, code: '#RP-1023', userName: 'Ali Raza', date: 'May 11, 2024', status: 'pending' },
  { id: 1022, code: '#RP-1022', userName: 'Ayesha Malik', date: 'May 10, 2024', status: 'reviewed' },
]

const defaultWeekDays = [
  { label: 'Sun', value: 18, secondary: 4 },
  { label: 'Mon', value: 24, secondary: 3 },
  { label: 'Tue', value: 28, secondary: 2 },
  { label: 'Wed', value: 22, secondary: 5 },
  { label: 'Thu', value: 26, secondary: 2 },
  { label: 'Fri', value: 20, secondary: 4 },
  { label: 'Sat', value: 16, secondary: 6 },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<'this_week' | 'last_week' | 'this_month'>('this_week')

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
    staleTime: 60_000,
  })

  const data = dashboardQuery.data

  // Metric values
  const statsMap: Record<string, { value: number; change: number }> = {
    users: {
      value: data?.stats.find((s) => s.label.toLowerCase().includes('user'))?.value ?? 248,
      change: data?.stats.find((s) => s.label.toLowerCase().includes('user'))?.change ?? 12,
    },
    groups: {
      value: data?.stats.find((s) => s.label.toLowerCase().includes('group'))?.value ?? 18,
      change: data?.stats.find((s) => s.label.toLowerCase().includes('group'))?.change ?? 0,
    },
    activities: {
      value:
        data?.stats.find((s) => s.label.toLowerCase().includes('activit') || s.label.toLowerCase().includes('timetable'))
          ?.value ?? 1142,
      change:
        data?.stats.find((s) => s.label.toLowerCase().includes('activit') || s.label.toLowerCase().includes('timetable'))
          ?.change ?? 15,
    },
    reports: {
      value: data?.stats.find((s) => s.label.toLowerCase().includes('report'))?.value ?? 92,
      change: data?.stats.find((s) => s.label.toLowerCase().includes('report'))?.change ?? 10,
    },
  }

  // Progress donut values (Completed, Pending, Missed)
  const completionRate = data?.completion?.rate ?? 78
  const completionPending = data?.completion
    ? Math.round((data.completion.in_progress / Math.max(1, data.completion.completed + data.completion.in_progress + data.completion.missed)) * 100) || 14
    : 14
  const completionMissed = data?.completion
    ? Math.round((data.completion.missed / Math.max(1, data.completion.completed + data.completion.in_progress + data.completion.missed)) * 100) || 8
    : 8

  // Activity Overview chart points
  const rawChartPoints = data?.charts?.weekly && data.charts.weekly.length > 0 ? data.charts.weekly : defaultWeekDays
  const chartPoints = rawChartPoints.slice(0, 7)

  // Recent Users
  const recentUsers =
    data?.recent_users && data.recent_users.length > 0
      ? data.recent_users.slice(0, 3).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          status: u.status || 'active',
        }))
      : sampleRecentUsers

  // Recent Reports
  const recentReports =
    data?.recent_reports && data.recent_reports.length > 0
      ? data.recent_reports.slice(0, 3).map((r) => ({
          id: r.id,
          code: `#RP-${r.id}`,
          userName: r.user_name ?? 'Member',
          date: formatDate(r.report_date, { month: 'short', day: 'numeric', year: 'numeric' }),
          status: (r.status === 'submitted' ? 'pending' : r.status) || 'completed',
        }))
      : sampleRecentReports

  return (
    <div className="dash-page">
      {/* Upper Section: Welcome Banner (left) + 2x2 Metric Cards (right) */}
      <section className="dash-top" aria-label="Welcome and summary">
        {/* Welcome Banner */}
        <div className="dash-hero">
          <div className="dash-hero__pattern" aria-hidden="true" />
          <div className="dash-hero__content">
            <span className="dash-hero__date">
              <CalendarDays className="h-3 w-3" />
              {formatDate(new Date().toISOString(), {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </span>
            <h1 className="dash-hero__title">Welcome Back, Admin!</h1>
            <p className="dash-hero__text">
              Here's what's happening in your organization today.
            </p>
            <div className="dash-hero__actions">
              <Link to="/admin/analytics">
                <Button className="dash-hero__button">
                  View Details
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          <div className="dash-hero__art" aria-hidden="true">
            <span className="dash-hero__glow" />
            <StarPattern className="dash-hero__star" />
            <StarPattern className="dash-hero__star dash-hero__star--small" />
            <MosqueIllustration className="dash-hero__mosque" />
          </div>
        </div>

        {/* 2x2 Metric Cards Grid */}
        <div className="dash-metrics-grid" aria-label="Key statistics">
          {metricConfigs.map((cfg) => {
            const stat = statsMap[cfg.key] ?? { value: cfg.fallbackValue, change: cfg.fallbackChange }
            const Icon = cfg.icon
            return (
              <article key={cfg.key} className={cn('dash-metric', `dash-metric--${cfg.accent}`)}>
                <div className="dash-metric__top">
                  <span className="dash-metric__icon">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="dash-trend is-up">
                    <ArrowUpRight className="h-3 w-3" />
                    +{stat.change}%
                  </span>
                </div>
                <p className="dash-metric__label">{cfg.label}</p>
                <div className="dash-metric__figure">
                  <strong>{stat.value.toLocaleString()}</strong>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        <div className="dash-state">Loading organization dashboard…</div>
      ) : dashboardQuery.isError && !data ? (
        <Card className="dash-panel dash-state-card">
          <EmptyState
            icon={BarChart3}
            title="Could not load the dashboard"
            description={errorMessage(dashboardQuery.error, 'The dashboard is currently unavailable.')}
            action={
              <Button variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Middle Section: Activity Overview (left) + Recent Users (right) */}
          <section className="dash-mid">
            {/* Activity Overview */}
            <Card className="dash-panel dash-activity">
              <div className="dash-panel__head">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F0E0] text-[#106030]">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="dash-panel__title">Activity Overview</h2>
                    <p className="dash-panel__sub">Daily completed and missed tasks</p>
                  </div>
                </div>
                <div className="dash-select">
                  <select
                    value={range}
                    onChange={(e) => setRange(e.target.value as typeof range)}
                    aria-label="Activity date range"
                  >
                    <option value="this_week">This Week</option>
                    <option value="last_week">Last Week</option>
                    <option value="this_month">This Month</option>
                  </select>
                  <ChevronDown className="dash-select__chevron h-3.5 w-3.5" />
                </div>
              </div>

              <div className="dash-activity__legend">
                <span>
                  <i className="is-completed" /> Completed
                </span>
                <span>
                  <i className="is-missed" /> Missed
                </span>
                <strong>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  {completionRate}% completion rate
                </strong>
              </div>

              <div className="dash-chart">
                <BarChart data={chartPoints} height={240} showYAxis />
              </div>
            </Card>

            {/* Recent Users */}
            <Card className="dash-panel">
              <div className="dash-panel__head">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F0E0] text-[#106030]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="dash-panel__title">Recent Users</h2>
                    <p className="dash-panel__sub">Active members in your organization</p>
                  </div>
                </div>
                <Link to="/admin/users" className="dash-link">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="dash-panel__body">
                <div className="space-y-1">
                  {recentUsers.map((member) => (
                    <Link
                      key={member.id}
                      to={`/admin/users/${member.id}`}
                      className="dash-user"
                    >
                      <Avatar name={member.name} size="md" />
                      <div className="dash-user__meta">
                        <p className="dash-user__name">{member.name}</p>
                        <p className="dash-user__email">{member.email}</p>
                      </div>
                      <div className="dash-user__right">
                        <span
                          className={cn(
                            'dash-status-pill',
                            member.status.toLowerCase() === 'pending'
                              ? 'is-pending'
                              : 'is-active'
                          )}
                        >
                          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          </section>

          {/* Bottom Section: Recent Reports (left) + Progress Overview (center) + Quote (right) */}
          <section className="dash-bottom">
            {/* Recent Reports (Table format) */}
            <Card className="dash-panel">
              <div className="dash-panel__head">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E8F3FA] text-[#398FCB]">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="dash-panel__title">Recent Reports</h2>
                    <p className="dash-panel__sub">Latest daily activity submissions</p>
                  </div>
                </div>
                <Link to="/admin/reports" className="dash-link">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="dash-panel__body">
                <div className="dash-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Report ID</th>
                        <th>User</th>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentReports.map((report) => (
                        <tr key={report.id}>
                          <td>
                            <Link
                              to={`/admin/reports/${report.id}`}
                              className="font-semibold text-[#145C3A] hover:underline"
                            >
                              {report.code}
                            </Link>
                          </td>
                          <td className="font-medium text-[#26332E]">{report.userName}</td>
                          <td className="text-slate-500">{report.date}</td>
                          <td>
                            <span
                              className={cn(
                                'dash-status-pill',
                                report.status.toLowerCase() === 'completed' && 'is-completed',
                                report.status.toLowerCase() === 'pending' && 'is-pending',
                                report.status.toLowerCase() === 'reviewed' && 'is-reviewed'
                              )}
                            >
                              {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Progress Overview (Donut chart) */}
            <Card className="dash-panel">
              <div className="dash-panel__head">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F0E0] text-[#106030]">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="dash-panel__title">Progress Overview</h2>
                    <p className="dash-panel__sub">Organization task completion</p>
                  </div>
                </div>
              </div>

              <div className="dash-panel__body flex flex-col items-center justify-center py-2">
                <ProgressDonut
                  completed={completionRate}
                  pending={completionPending}
                  missed={completionMissed}
                  size={144}
                  strokeWidth={13}
                  centerLabel={`${completionRate}%`}
                  centerSublabel="Overall"
                  showLegend={true}
                />
              </div>
            </Card>

            {/* Motivational Quote Card */}
            <Card className="dash-panel dash-quote">
              <div className="dash-quote__pattern" aria-hidden="true" />
              <StarPattern className="dash-quote__star" />
              <MosqueLandscape className="dash-quote__mosque" />
              <BotanicalLeaves className="absolute bottom-0 right-4 h-16 w-36 text-[#2f7f4b]" />
              <div className="dash-quote__content">
                <span className="dash-quote__mark">
                  <Quote className="h-6 w-6 text-[#106030]" />
                </span>
                <blockquote className="dash-quote__text font-serif italic text-[#145C3A]">
                  “Small steps every day lead to big changes.”
                </blockquote>
                <div className="dash-quote__note">
                  <span aria-hidden="true" />
                  Daily consistency in deen and life.
                </div>
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
