import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Flame,
  Moon,
  Plus,
  Target,
  TrendingUp,
} from 'lucide-react'
import { useAuth } from '../../features/auth/useAuth'
import { MosqueIllustration, StarPattern } from '../../components/shared/MosqueIllustration'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Avatar } from '../../components/ui/Avatar'
import { ActivityStatusBadge, ActivityTypeBadge } from '../../components/shared/StatusBadge'
import {
  goals,
  habits,
  prayerTimes,
  todaySchedule,
  userReports,
} from '../../lib/mockData'
import { formatDate, formatTime, todayISO } from '../../lib/format'
import { cn } from '../../lib/utils'

export function UserDashboardPage() {
  const { user } = useAuth()
  const firstName = user?.name?.split(' ')[0] ?? 'Friend'
  const completed = todaySchedule.filter((activity) => activity.status === 'completed').length
  const completion = Math.round((completed / todaySchedule.length) * 100)
  const nextPrayer = prayerTimes.find((prayer) => prayer.status !== 'completed') ?? prayerTimes[0]
  const activeHabits = habits.filter((habit) => habit.is_active)
  const averageHabit = Math.round(
    (activeHabits.reduce((sum, habit) => sum + habit.completed_days / habit.target_per_week, 0) /
      Math.max(1, activeHabits.length)) *
      100
  )
  const upcomingGoals = goals.filter((goal) => goal.status !== 'completed').slice(0, 3)
  const latestReport = userReports[0]

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 p-6 text-white shadow-card sm:p-8">
        <div className="pattern-dots absolute inset-0 opacity-30" />
        <StarPattern className="absolute right-8 top-6 hidden h-28 w-28 text-brand-200/60 sm:block" />
        <MosqueIllustration className="absolute -bottom-4 right-0 hidden w-[380px] text-brand-200/50 lg:block" />
        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-50">
            <CalendarDays className="h-3 w-3" />
            {formatDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight sm:text-3xl">
            Assalamu alaikum, {firstName}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-brand-100/90">
            You have {todaySchedule.length - completed} activities left today and{' '}
            {activeHabits.length} active habits. Small, consistent steps — keep going.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link to="/app/activities/new">
              <Button variant="secondary" className="bg-white text-brand-800 hover:bg-brand-50">
                <Plus className="h-4 w-4" />
                Add activity
              </Button>
            </Link>
            <Link to="/app/reports/new">
              <Button
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/15"
              >
                <ClipboardList className="h-4 w-4" />
                Daily report
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's completion"
          value={`${completion}%`}
          icon={CheckCircle2}
          hint={`${completed} of ${todaySchedule.length} done`}
        />
        <StatCard
          label="Habit consistency"
          value={`${averageHabit}%`}
          icon={Flame}
          accent="amber"
          hint="this week"
        />
        <StatCard
          label="Active goals"
          value={upcomingGoals.length}
          icon={Target}
          accent="sky"
          hint="in progress"
        />
        <StatCard
          label="Last report score"
          value={`${latestReport.calculated_score?.toFixed(0)}%`}
          icon={TrendingUp}
          accent="emerald"
          hint={formatDate(latestReport.report_date)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Today's schedule</CardTitle>
              <p className="mt-1 text-sm text-slate-500">{formatDate(todayISO())}</p>
            </div>
            <Link to="/app/schedule">
              <Button variant="ghost" size="sm">
                View all
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {todaySchedule.slice(0, 5).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition-colors hover:bg-slate-50/60"
              >
                <div className="w-14 shrink-0 text-center">
                  <p className="text-xs font-bold text-slate-700">{formatTime(activity.start_time)}</p>
                </div>
                <div
                  className={cn(
                    'h-8 w-1 rounded-full',
                    activity.status === 'completed'
                      ? 'bg-emerald-400'
                      : activity.status === 'missed'
                        ? 'bg-red-300'
                        : 'bg-brand-200'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{activity.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <ActivityTypeBadge type={activity.activity_type} />
                  </div>
                </div>
                <ActivityStatusBadge status={activity.status} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-brand-100">
                  <Moon className="h-3.5 w-3.5" />
                  Next prayer
                </div>
                <Badge className="border-white/20 bg-white/15 text-white">{nextPrayer.status}</Badge>
              </div>
              <p className="mt-3 text-2xl font-bold">{nextPrayer.name}</p>
              <p className="text-sm text-brand-100" dir="rtl">
                {nextPrayer.arabic}
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight">{formatTime(nextPrayer.time)}</p>
            </div>
            <CardContent className="space-y-2 p-4">
              {prayerTimes.slice(0, 5).map((prayer) => (
                <div key={prayer.name} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2 text-slate-600">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        prayer.status === 'completed'
                          ? 'bg-emerald-400'
                          : prayer.status === 'current'
                            ? 'bg-brand-500'
                            : 'bg-slate-300'
                      )}
                    />
                    {prayer.name}
                  </span>
                  <span className="font-medium text-slate-700">{formatTime(prayer.time)}</span>
                </div>
              ))}
              <Link to="/app/prayer">
                <Button variant="soft" size="sm" className="mt-1 w-full">
                  Prayer schedule
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily report</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <CircularProgress value={latestReport.calculated_score ?? 0} size={116} strokeWidth={9} />
              <p className="text-center text-xs text-slate-500">
                {latestReport.summary}
              </p>
              <Link to="/app/reports/new" className="w-full">
                <Button size="sm" className="w-full">
                  <ClipboardList className="h-4 w-4" />
                  Write today's report
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-base">Habits</CardTitle>
            </div>
            <Link to="/app/habits" className="text-xs font-semibold text-brand-700 hover:underline">
              Manage
            </Link>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {activeHabits.slice(0, 4).map((habit) => {
              const percent = Math.round((habit.completed_days / habit.target_per_week) * 100)
              return (
                <div key={habit.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{habit.name}</span>
                    <span className="text-slate-500">
                      {habit.completed_days}/{habit.target_per_week} · {habit.streak}🔥
                    </span>
                  </div>
                  <Progress value={percent} size="sm" />
                </div>
              )
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-sky-500" />
              <CardTitle className="text-base">Goals</CardTitle>
            </div>
            <Link to="/app/goals" className="text-xs font-semibold text-brand-700 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingGoals.map((goal) => (
              <div key={goal.id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{goal.title}</p>
                  <p className="text-[11px] text-slate-500">
                    {goal.category} · due {formatDate(goal.target_date)}
                  </p>
                  <Progress value={goal.progress} size="sm" className="mt-2" />
                </div>
                <span className="text-sm font-bold text-slate-700">{goal.progress}%</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Calendar & planner', description: 'Plan your week ahead', to: '/app/calendar', icon: CalendarDays },
          { label: 'Journal', description: 'Reflect on your day', to: '/app/journal', icon: BookOpen },
          { label: 'Digital library', description: 'Browse resources', to: '/app/library', icon: BookOpen },
        ].map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card"
            >
              <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800">{action.label}</p>
                <p className="text-xs text-slate-500">{action.description}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-500" />
            </Link>
          )
        })}
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-soft">
        <Avatar name={user?.name ?? 'You'} size="sm" />
        <span>
          Signed in as <span className="font-semibold text-slate-700">{user?.email}</span>
        </span>
        <Badge variant="success" className="ml-auto" dot>
          Synced
        </Badge>
      </div>
    </div>
  )
}
