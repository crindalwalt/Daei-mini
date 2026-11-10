import { useMemo, useState } from 'react'
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
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Progress } from '../../components/ui/Progress'
import { Select } from '../../components/ui/Select'
import { BarChart, LineChart } from '../../components/charts/Charts'
import { useToast } from '../../components/ui/toast/ToastProvider'
import {
  activityOverview,
  adminUsers,
  completionTrend,
  groups,
  weeklyActivity,
} from '../../lib/mockData'
import { activityTypeMeta } from '../../components/shared/StatusBadge'
import type { ActivityType } from '../../types/domain'
import { cn } from '../../lib/utils'

const typeBreakdown: { type: ActivityType; value: number }[] = [
  { type: 'prayer', value: 412 },
  { type: 'quran', value: 208 },
  { type: 'reading', value: 146 },
  { type: 'exercise', value: 132 },
  { type: 'habit', value: 118 },
  { type: 'goal', value: 64 },
  { type: 'personal', value: 62 },
]

export function AnalyticsPage() {
  const toast = useToast()
  const [range, setRange] = useState('30')

  const totalTypeValue = useMemo(
    () => typeBreakdown.reduce((sum, item) => sum + item.value, 0),
    []
  )

  const topUsers = useMemo(
    () =>
      [...adminUsers]
        .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))
        .slice(0, 5),
    []
  )

  const chartData = range === '7' ? weeklyActivity : activityOverview
  const averageCompletion =
    Math.round(groups.reduce((sum, group) => sum + group.progress, 0) / groups.length) || 0

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
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info('The analytics export is being prepared.')}
            >
              <Download className="h-4 w-4" />
              Export report
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active users" value={186} change={12.5} icon={Users} hint="of 248 members" />
        <StatCard
          label="Avg. completion"
          value={`${averageCompletion}%`}
          change={4.2}
          icon={Target}
          accent="emerald"
          hint="across all groups"
        />
        <StatCard
          label="Activities logged"
          value={1142}
          change={8.7}
          icon={ActivityIcon}
          accent="sky"
          hint="this period"
        />
        <StatCard
          label="Reports submitted"
          value={92}
          change={-2.1}
          trend="down"
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
            <Badge variant="success" dot>
              +6.4% overall
            </Badge>
          </CardHeader>
          <CardContent>
            <LineChart data={completionTrend} height={230} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity breakdown</CardTitle>
            <p className="text-sm text-slate-500">Share of logged activities by type</p>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {typeBreakdown.map((item) => {
              const meta = activityTypeMeta(item.type)
              const Icon = meta.icon
              const percent = Math.round((item.value / totalTypeValue) * 100)
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
            })}
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
            Improving
          </span>
        </CardHeader>
        <CardContent>
          <BarChart data={chartData} height={230} showLegend />
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
            {topUsers.map((member, index) => (
              <div key={member.id} className="flex items-center gap-3">
                <span className="w-4 text-center text-xs font-bold text-slate-400">{index + 1}</span>
                <Avatar name={member.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                  <p className="truncate text-[11px] text-slate-500">{member.group}</p>
                </div>
                <div className="w-28">
                  <Progress value={member.progress ?? 0} size="sm" />
                </div>
                <span className="w-10 text-right text-sm font-semibold text-slate-700">
                  {member.progress}%
                </span>
              </div>
            ))}
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
            {groups.map((group) => (
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
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Most consistent group',
            value: "Sisters' Circle",
            hint: '88% average completion',
            icon: Trophy,
          },
          {
            label: 'Best day',
            value: 'Thursday',
            hint: '46 activities completed',
            icon: CalendarDays,
          },
          {
            label: 'Reports awaiting review',
            value: '14',
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
    </div>
  )
}
