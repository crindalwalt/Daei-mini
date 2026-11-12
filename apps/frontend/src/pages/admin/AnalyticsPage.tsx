import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Activity as ActivityIcon,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Download,
  Target,
  TrendingUp,
  Trophy,
  Users,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { EmptyState } from '../../components/shared/EmptyState'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Progress } from '../../components/ui/Progress'
import { Select } from '../../components/ui/Select'
import { BarChart, LineChart } from '../../components/charts/Charts'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { activityTypeMeta } from '../../components/shared/StatusBadge'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function AnalyticsPage() {
  const toast = useToast()
  const [range, setRange] = useState('30')
  const [exporting, setExporting] = useState(false)

  const analyticsQuery = useQuery({
    queryKey: ['admin', 'analytics', range],
    queryFn: () => adminApi.analytics(Number(range)),
    staleTime: 60_000,
  })

  const data = analyticsQuery.data

  const typeBreakdown = useMemo(
    () => (data?.type_breakdown ?? []).filter((item) => item.value > 0),
    [data]
  )

  const totalTypeValue = useMemo(
    () => typeBreakdown.reduce((sum, item) => sum + item.value, 0),
    [typeBreakdown]
  )

  const completionTrend = data?.completion_trend ?? []
  const activityVolume = data?.activity_volume ?? []
  const topUsers = data?.top_users ?? []
  const groups = data?.groups ?? []
  const highlights = data?.highlights
  const stats = data?.stats

  const overallTrend =
    completionTrend.length < 2
      ? 0
      : Math.round(
          ((completionTrend[completionTrend.length - 1]?.value ?? 0) -
            (completionTrend[0]?.value ?? 0)) *
            10
        ) / 10

  const handleExport = async () => {
    setExporting(true)
    try {
      await adminApi.exportAnalytics(Number(range))
      toast.success('The analytics CSV has been downloaded.')
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export analytics.'), 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Analytics & progress"
        description="Understand engagement, completion trends and which groups need support."
        actions={
          <>
            <Select
              containerClassName="w-40"
              value={range}
              onChange={(event) => setRange(event.target.value)}
              aria-label="Select date range"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
              <Download className="h-4 w-4" />
              Export report
            </Button>
          </>
        }
      />

      {analyticsQuery.isLoading ? (
        <div className="py-20 text-center text-sm text-slate-500">Loading analytics…</div>
      ) : analyticsQuery.isError || !data || !stats ? (
        <EmptyState
          icon={BarChart3}
          title="Could not load analytics"
          description={errorMessage(analyticsQuery.error, 'Analytics are unavailable right now.')}
          action={<Button variant="outline" size="sm" onClick={() => void analyticsQuery.refetch()}>Try again</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Active users"
              value={stats.active_users}
              icon={Users}
              hint={`of ${stats.total_users.toLocaleString()} members`}
            />
            <StatCard
              label="Avg. completion"
              value={`${stats.average_completion}%`}
              icon={Target}
              accent="emerald"
              hint={`last ${data.range} days`}
            />
            <StatCard
              label="Activities logged"
              value={stats.activities_logged}
              change={stats.activities_change}
              trend={stats.activities_change >= 0 ? 'up' : 'down'}
              icon={ActivityIcon}
              accent="sky"
              hint="vs last period"
            />
            <StatCard
              label="Reports submitted"
              value={stats.reports_submitted}
              change={stats.reports_change}
              trend={stats.reports_change >= 0 ? 'up' : 'down'}
              icon={CheckCircle2}
              accent="amber"
              hint="vs last period"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Completion trend</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Weekly completion rate over 8 weeks</p>
                </div>
                <Badge variant={overallTrend >= 0 ? 'success' : 'destructive'} dot>
                  {overallTrend >= 0 ? '+' : ''}
                  {overallTrend}% overall
                </Badge>
              </CardHeader>
              <CardContent>
                {completionTrend.length === 0 ? (
                  <div className="py-10 text-center text-sm text-slate-500">No completion data yet.</div>
                ) : (
                  <LineChart data={completionTrend} height={230} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity breakdown</CardTitle>
                <p className="text-sm text-slate-500">Share of logged activities by type</p>
              </CardHeader>
              <CardContent className="space-y-3.5">
                {typeBreakdown.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">
                    No activities were logged in this period.
                  </p>
                ) : (
                  typeBreakdown.map((item) => {
                    const meta = activityTypeMeta(item.type)
                    const Icon = meta.icon
                    const percent = totalTypeValue === 0 ? 0 : Math.round((item.value / totalTypeValue) * 100)
                    return (
                      <div key={item.type}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                            <span className={cn('rounded-md p-1', meta.className)}>
                              <Icon className="h-3 w-3" />
                            </span>
                            {meta.label}
                          </span>
                          <span className="font-semibold text-slate-700">{percent}%</span>
                        </div>
                        <Progress value={percent} size="sm" />
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Activity volume</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Completed vs missed activities</p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                Last 7 days
              </span>
            </CardHeader>
            <CardContent>
              {activityVolume.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">No activity volume recorded yet.</div>
              ) : (
                <BarChart data={activityVolume} height={230} showLegend />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Top members</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Highest completion this period</p>
                </div>
                <Trophy className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent className="space-y-3">
                {topUsers.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No member scores yet.</p>
                ) : (
                  topUsers.map((member, index) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <span className="w-4 text-center text-xs font-bold text-slate-400">{index + 1}</span>
                      <Avatar name={member.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                        <p className="truncate text-[11px] text-slate-500">{member.group ?? 'No group'}</p>
                      </div>
                      <div className="w-28">
                        <Progress value={member.progress ?? 0} size="sm" />
                      </div>
                      <span className="w-10 text-right text-sm font-semibold text-slate-700">
                        {member.progress ?? 0}%
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <div>
                  <CardTitle>Group performance</CardTitle>
                  <p className="mt-1 text-sm text-slate-500">Completion by group this period</p>
                </div>
                <UsersRound className="h-4 w-4 text-brand-500" />
              </CardHeader>
              <CardContent className="space-y-3.5">
                {groups.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No groups to display yet.</p>
                ) : (
                  groups.map((group) => (
                    <div key={group.id}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-600">
                          {group.name}
                          <span className="text-slate-400">· {group.members_count} members</span>
                        </span>
                        <span className="font-semibold text-slate-700">{group.progress}%</span>
                      </div>
                      <Progress value={group.progress} size="sm" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Most consistent group',
                value: highlights?.most_consistent_group ?? 'Not available',
                hint: `${highlights?.most_consistent_score ?? 0}% average completion`,
                icon: Trophy,
              },
              {
                label: 'Best day',
                value: highlights?.best_day ? formatDate(highlights.best_day) : 'Not available',
                hint: `${highlights?.best_day_count ?? 0} activities completed`,
                icon: CalendarDays,
              },
              {
                label: 'Reports awaiting review',
                value: highlights?.reports_awaiting_review ?? 0,
                hint: 'Across all groups',
                icon: BarChart3,
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Card key={item.label}>
                  <CardContent className="flex items-center gap-3 p-5">
                    <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {item.label}
                      </p>
                      <p className="truncate text-lg font-bold text-slate-900">{item.value}</p>
                      <p className="text-xs text-slate-500">{item.hint}</p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
