import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CalendarDays,
  CheckCircle2,
  Plus,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Progress } from '../../components/ui/Progress'
import { Modal } from '../../components/ui/Modal'
import { GoalStatusBadge } from '../../components/shared/StatusBadge'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { goals as seedGoals } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import type { Goal, GoalStatus } from '../../types/domain'

const goalSchema = z.object({
  title: z.string().min(3, 'Give the goal a title (at least 3 characters)'),
  description: z.string().max(300, 'Keep it under 300 characters').optional(),
  category: z.string().min(1, 'Choose a category'),
  target_date: z.string().min(1, 'Choose a target date'),
  progress: z.coerce.number().min(0).max(100),
})

type GoalFormInput = z.input<typeof goalSchema>
type GoalValues = z.output<typeof goalSchema>

const categories = ['Spiritual', 'Health', 'Learning', 'Finance', 'Family', 'Career']

const statusFilters: { value: GoalStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All goals' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'paused', label: 'Paused' },
  { value: 'not_started', label: 'Not started' },
]

export function GoalsPage() {
  const toast = useToast()
  const [goalList, setGoalList] = useState<Goal[]>(seedGoals)
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<GoalStatus | 'all'>('all')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormInput, unknown, GoalValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'Spiritual',
      target_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      progress: 0,
    },
  })

  const filtered = useMemo(
    () => goalList.filter((goal) => filter === 'all' || goal.status === filter),
    [goalList, filter]
  )

  const stats = useMemo(() => {
    const active = goalList.filter((goal) => goal.status === 'in_progress')
    const average =
      active.length === 0
        ? 0
        : Math.round(active.reduce((sum, goal) => sum + goal.progress, 0) / active.length)
    return {
      active: active.length,
      completed: goalList.filter((goal) => goal.status === 'completed').length,
      average,
    }
  }, [goalList])

  const bumpProgress = (goal: Goal) => {
    const next = Math.min(100, goal.progress + 10)
    setGoalList((current) =>
      current.map((item) =>
        item.id === goal.id
          ? {
              ...item,
              progress: next,
              status: next === 100 ? 'completed' : 'in_progress',
            }
          : item
      )
    )
    toast.success(`${goal.title} is now ${next}% complete.`)
  }

  const onSubmit = async (values: GoalValues) => {
    const newGoal: Goal = {
      id: Date.now(),
      title: values.title,
      description: values.description ?? null,
      category: values.category,
      target_date: values.target_date,
      progress: values.progress,
      status: values.progress >= 100 ? 'completed' : values.progress > 0 ? 'in_progress' : 'not_started',
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
    setGoalList((current) => [newGoal, ...current])
    setModalOpen(false)
    reset()
    toast.success(`${values.title} was added to your goals.`, 'Goal created')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Goals"
        description="Set meaningful targets, track progress and celebrate the finish line."
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New goal
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active goals" value={stats.active} icon={Target} hint="in progress" />
        <StatCard
          label="Average progress"
          value={`${stats.average}%`}
          icon={TrendingUp}
          accent="sky"
          hint="across active goals"
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={Trophy}
          accent="emerald"
          hint="achieved goals"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {statusFilters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === option.value
                ? 'border-brand-600 bg-brand-600 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:text-brand-700'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((goal) => (
          <Card key={goal.id} className="flex flex-col transition-shadow hover:shadow-card">
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                  <Target className="h-4 w-4" />
                </span>
                <GoalStatusBadge status={goal.status} />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-900">{goal.title}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-500">{goal.description}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-slate-400">
                <CalendarDays className="h-3 w-3" />
                {goal.category} · target {formatDate(goal.target_date)}
              </p>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Progress</span>
                  <span className="font-semibold text-slate-700">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                {goal.status === 'completed' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Achieved
                  </span>
                ) : (
                  <Button variant="soft" size="sm" onClick={() => bumpProgress(goal)}>
                    Update +10%
                  </Button>
                )}
                <span className="text-[10px] uppercase tracking-wider text-slate-400">
                  {goal.progress >= 75 ? 'Almost there' : goal.progress >= 40 ? 'On track' : 'Just started'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            No goals with this status yet.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Progress overview</CardTitle>
          <p className="text-sm text-slate-500">All goals at a glance</p>
        </CardHeader>
        <CardContent className="space-y-3.5">
          {goalList.map((goal) => (
            <div key={goal.id}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">{goal.title}</span>
                <span className="text-slate-500">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} size="sm" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a goal"
        description="Choose something meaningful and break it into a realistic target date."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-goal-form" isLoading={isSubmitting}>
              <Plus className="h-4 w-4" />
              Create goal
            </Button>
          </>
        }
      >
        <form id="create-goal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Goal title" placeholder="Complete Quran recitation" error={errors.title?.message} {...register('title')} />
          <Textarea
            label="Description (optional)"
            placeholder="What does completing this goal look like?"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Category" error={errors.category?.message} {...register('category')}>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            <Input
              label="Target date"
              type="date"
              error={errors.target_date?.message}
              {...register('target_date')}
            />
          </div>
          <Input
            label="Starting progress (%)"
            type="number"
            min={0}
            max={100}
            error={errors.progress?.message}
            {...register('progress')}
          />
        </form>
      </Modal>
    </div>
  )
}
