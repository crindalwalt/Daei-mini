import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Clock3,
  FileText,
  Quote,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import { MosqueIllustration, StarPattern } from '../../components/shared/MosqueIllustration'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { CircularProgress } from '../../components/ui/Progress'
import { BarChart } from '../../components/charts/Charts'
import { UserStatusBadge, ReportStatusBadge } from '../../components/shared/StatusBadge'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { formatDate, relativeTime } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { AdminStat } from '../../types/domain'
import '../../styles/admin-dashboard.css'

const metricVisuals: { icon: LucideIcon; accent: string; color: string }[] = [
  { icon: Users, accent: 'forest', color: '#106030' },
  { icon: UsersRound, accent: 'meadow', color: '#309050' },
  { icon: FileText, accent: 'amber', color: '#c47c1f' },
  { icon: CalendarDays, accent: 'sky', color: '#3478a8' },
]

const progressRows = [
  { key: 'user_growth', label: 'User Growth', color: '#106030' },
  { key: 'group_activity', label: 'Group Activity', color: '#309050' },
  { key: 'report_generation', label: 'Report Generation', color: '#8fae72' },
] as const

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.length > 1 ? values : [0, 0, 0, 0, 0, 0]
  const max = Math.max(1, ...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = 100 - ((value - min) / range) * 82 - 9
      return `${x},${y}`
    })
    .join(' ')
  const area = `0,100 ${points} 100,100`

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="dash-spark"
    >
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function MetricCard({ stat, index }: { stat: AdminStat; index: number }) {
  const visual = metricVisuals[index] ?? metricVisuals[0]
  const Icon = visual.icon
  const positive = stat.trend !== 'down'

  return (
    <article className={cn('dash-metric', `dash-metric--${visual.accent}`)}>
      <div className="dash-metric__top">
        <span className="dash-metric__icon">
          <Icon className="h-[19px] w-[19px]" />
        </span>
        <span className={cn('dash-trend', positive ? 'is-up' : 'is-down')}>
          {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {stat.change}%
        </span>
      </div>
      <p className="dash-metric__label">{stat.label}</p>
      <div className="dash-metric__figure">
        <strong>{stat.value.toLocaleString()}</strong>
        <Sparkline values={stat.series ?? []} color={visual.color} />
      </div>
      <p className="dash-metric__foot">vs previous 30 days</p>
    </article>
  )
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div>
      <div className="dash-progress__row-top">
        <span>{label}</span>
        <strong>{clamped}%</strong>
      </div>
      <div className="dash-bar">
        <span style={{ width: `${clamped}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const { user } = useAuth()
  const [range, setRange] = useState<'weekly' | 'monthly'>('monthly')
  const firstName = user?.name?.split(' ')[0] ?? 'Admin'

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.dashboard(),
    staleTime: 60_000,
  })

  const data = dashboardQuery.data
  const chartData = data?.charts[range] ?? []
  const recentUsers = data?.recent_users ?? []
  const recentReports = data?.recent_reports ?? []
  const completion = data?.completion
  const progress = data?.progress_overview ?? {
    user_growth: 0,
    group_activity: 0,
    report_generation: 0,
  }

  return (
    <div className="dash-page">
      <section className="dash-hero">
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
          <h1 className="dash-hero__title">Assalamu alaikum, {firstName}</h1>
          <p className="dash-hero__text">
            May your day be filled with barakah. Here is a gentle overview of how your community is
            progressing in worship, learning and daily habits.
          </p>
          <div className="dash-hero__actions">
            <Link to="/admin/reports">
              <Button className="dash-hero__button">
                <FileText className="h-4 w-4" />
                Review today&apos;s reports
              </Button>
            </Link>
            <Link to="/admin/analytics" className="dash-hero__link">
              View analytics
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="dash-hero__art" aria-hidden="true">
          <span className="dash-hero__glow" />
          <StarPattern className="dash-hero__star" />
          <StarPattern className="dash-hero__star dash-hero__star--small" />
          <MosqueIllustration className="dash-hero__mosque" />
        </div>
      </section>

      {dashboardQuery.isLoading ? (
        <div className="dash-state">Loading the community dashboard…</div>
      ) : dashboardQuery.isError || !data || !completion ? (
        <Card className="dash-panel dash-state-card">
          <EmptyState
            icon={BarChart3}
            title="Could not load the dashboard"
            description={errorMessage(dashboardQuery.error, 'The dashboard is unavailable right now.')}
            action={
              <Button variant="outline" size="sm" onClick={() => void dashboardQuery.refetch()}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <section className="dash-metrics" aria-label="Community summary">
            {data.stats.map((stat, index) => (
              <MetricCard key={stat.label} stat={stat} index={index} />
            ))}
          </section>

          <section className="dash-mid">
            <Card className="dash-panel dash-activity">
              <div className="dash-panel__head">
                <div>
                  <h2 className="dash-panel__title">Activity Overview</h2>
                  <p className="dash-panel__sub">Completed and missed activities over time</p>
                </div>
                <div className="dash-select">
                  <select
                    value={range}
                    onChange={(event) => setRange(event.target.value as 'weekly' | 'monthly')}
                    aria-label="Activity range"
                  >
                    <option value="weekly">Last 7 Days</option>
                    <option value="monthly">Last 30 Days</option>
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
                  {completion.rate}% completion rate
                </strong>
              </div>

              <div className="dash-chart">
                {chartData.length === 0 ? (
                  <div className="dash-chart-empty">No activity data yet.</div>
                ) : (
                  <BarChart data={chartData} height={268} showYAxis />
                )}
              </div>
            </Card>

            <Card className="dash-panel dash-quote">
              <div className="dash-quote__pattern" aria-hidden="true" />
              <StarPattern className="dash-quote__star" />
              <MosqueIllustration className="dash-quote__mosque" />
              <div className="dash-quote__content">
                <span className="dash-quote__mark">
                  <Quote className="h-6 w-6" />
                </span>
                <blockquote className="dash-quote__text">
                  Indeed, with hardship comes ease.
                </blockquote>
                <p className="dash-quote__cite">Qur&apos;an 94:5–6</p>
                <div className="dash-quote__note">
                  <span aria-hidden="true" />
                  Small, consistent deeds build a beautiful routine.
                </div>
              </div>
            </Card>
          </section>

          <section className="dash-bottom">
            <Card className="dash-panel">
              <div className="dash-panel__head">
                <div>
                  <h2 className="dash-panel__title">Recent Users</h2>
                  <p className="dash-panel__sub">Newest members of the community</p>
                </div>
                <Link to="/admin/users" className="dash-link">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="dash-panel__body">
                {recentUsers.length === 0 ? (
                  <p className="dash-empty-row">No members yet.</p>
                ) : (
                  recentUsers.map((member) => (
                    <Link key={member.id} to={`/admin/users/${member.id}`} className="dash-user">
                      <Avatar name={member.name} size="md" />
                      <div className="dash-user__meta">
                        <p className="dash-user__name">{member.name}</p>
                        <p className="dash-user__email">{member.email}</p>
                      </div>
                      <div className="dash-user__right">
                        <UserStatusBadge status={member.status} />
                        <span className="dash-user__time">
                          <Clock3 className="h-3 w-3" />
                          {relativeTime(member.last_active)}
                        </span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card className="dash-panel">
              <div className="dash-panel__head">
                <div>
                  <h2 className="dash-panel__title">Recent Reports</h2>
                  <p className="dash-panel__sub">Latest daily submissions</p>
                </div>
                <Link to="/admin/reports" className="dash-link">
                  View All
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="dash-panel__body">
                {recentReports.length === 0 ? (
                  <p className="dash-empty-row">No reports submitted yet.</p>
                ) : (
                  recentReports.map((report) => (
                    <Link
                      key={report.id}
                      to={`/admin/reports/${report.id}`}
                      className="dash-report"
                    >
                      <span className="dash-report__icon">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="dash-report__meta">
                        <p className="dash-report__title">
                          {report.summary?.trim() || `Daily report · ${report.user_name ?? 'Member'}`}
                        </p>
                        <p className="dash-report__sub">
                          {report.user_name ?? 'Member'} · {formatDate(report.report_date)}
                        </p>
                      </div>
                      <ReportStatusBadge status={report.status} />
                    </Link>
                  ))
                )}
              </div>
            </Card>

            <Card className="dash-panel dash-progress">
              <div className="dash-panel__head">
                <div>
                  <h2 className="dash-panel__title">Progress Overview</h2>
                  <p className="dash-panel__sub">Community health this month</p>
                </div>
              </div>

              <div className="dash-progress__circle">
                <CircularProgress
                  value={completion.rate}
                  size={138}
                  strokeWidth={11}
                  trackClassName="dash-progress__track"
                  barClassName="dash-progress__bar"
                >
                  <span className="dash-progress__value">{completion.rate}%</span>
                  <span className="dash-progress__label">Overall</span>
                </CircularProgress>
                <p className="dash-progress__caption">
                  {completion.completed.toLocaleString()} completed ·{' '}
                  {completion.missed.toLocaleString()} missed
                </p>
              </div>

              <div className="dash-progress__rows">
                {progressRows.map((row) => (
                  <ProgressRow
                    key={row.key}
                    label={row.label}
                    value={progress[row.key]}
                    color={row.color}
                  />
                ))}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
