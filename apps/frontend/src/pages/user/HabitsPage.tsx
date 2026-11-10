import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  Repeat,
  Target,
  TrendingUp,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Progress } from '../../components/ui/Progress'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { habits as seedHabits } from '../../lib/mockData'
import type { Habit } from '../../types/domain'
import { cn } from '../../lib/utils'

const habitSchema = z.object({
  name: z.string().min(3, 'Give the habit a name (at least 3 characters)'),
  description: z.string().max(200, 'Keep the description under 200 characters').optional(),
  target_per_week: z.coerce.number().min(1, 'At least 1 day').max(7, 'At most 7 days'),
})

type HabitFormInput = z.input<typeof habitSchema>
type HabitValues = z.output<typeof habitSchema>

const colors = ['brand', 'emerald', 'sky', 'amber', 'rose']
const colorStyles: Record<string, string> = {
  brand: 'bg-brand-600',
  emerald: 'bg-emerald-500',
  sky: 'bg-sky-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
}

export function HabitsPage() {
  const toast = useToast()
  const [habitList, setHabitList] = useState<Habit[]>(seedHabits)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormInput, unknown, HabitValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: { name: '', description: '', target_per_week: 7 },
  })

  const stats = useMemo(() => {
    const total = habitList.length
    const consistency =
      total === 0
        ? 0
        : Math.round(
            (habitList.reduce(
              (sum, habit) => sum + habit.completed_days / Math.max(1, habit.target_per_week),
              0
            ) /
              total) *
              100
          )
    const bestStreak = habitList.reduce((max, habit) => Math.max(max, habit.streak), 0)
    return { total, consistency, bestStreak }
  }, [habitList])

  const toggleDay = (habit: Habit) => {
    setHabitList((current) =>
      current.map((item) =>
        item.id === habit.id
          ? {
              ...item,
              completed_days: Math.min(item.target_per_week, item.completed_days + 1),
              streak: item.streak + 1,
            }
          : item
      )
    )
    toast.success(`${habit.name} checked in for today.`, 'Nice work')
  }

  const onSubmit = async (values: HabitValues) => {
    const newHabit: Habit = {
      id: Date.now(),
      name: values.name,
      description: values.description ?? null,
      is_active: true,
      streak: 0,
      target_per_week: values.target_per_week,
      completed_days: 0,
      color: colors[habitList.length % colors.length],
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
    setHabitList((current) => [...current, newHabit])
    setModalOpen(false)
    reset()
    toast.success(`${values.name} added to your habits.`, 'Habit created')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Habits"
        description="Build consistency with small, repeatable actions and gentle streaks."
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            New habit
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active habits" value={stats.total} icon={Repeat} hint="tracked this week" />
        <StatCard
          label="Consistency"
          value={`${stats.consistency}%`}
          icon={TrendingUp}
          accent="emerald"
          hint="towards weekly targets"
        />
        <StatCard
          label="Best streak"
          value={`${stats.bestStreak} days`}
          icon={Flame}
          accent="amber"
          hint="keep it alive"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {habitList.map((habit) => {
          const percent = Math.round((habit.completed_days / habit.target_per_week) * 100)
          const done = habit.completed_days >= habit.target_per_week
          return (
            <Card key={habit.id} className={cn('transition-shadow hover:shadow-card', done && 'border-emerald-200')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        'rounded-xl p-2.5 text-white',
                        colorStyles[habit.color ?? 'brand'] ?? colorStyles.brand
                      )}
                    >
                      <Repeat className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{habit.name}</h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {habit.description ?? 'No description'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={done ? 'success' : 'warning'} dot>
                    {habit.streak} day streak
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-slate-500">This week</span>
                    <span className="font-semibold text-slate-700">
                      {habit.completed_days} / {habit.target_per_week} days
                    </span>
                  </div>
                  <Progress
                    value={percent}
                    barClassName={colorStyles[habit.color ?? 'brand'] ?? colorStyles.brand}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-1.5">
                    {Array.from({ length: habit.target_per_week }).map((_, index) => {
                      const filled = index < habit.completed_days
                      return (
                        <span
                          key={index}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-md',
                            filled
                              ? 'bg-emerald-100 text-emerald-600'
                              : 'bg-slate-100 text-slate-300'
                          )}
                        >
                          {filled ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <Circle className="h-3.5 w-3.5" />
                          )}
                        </span>
                      )
                    })}
                  </div>
                  <Button
                    variant={done ? 'outline' : 'soft'}
                    size="sm"
                    onClick={() => toggleDay(habit)}
                    disabled={done}
                  >
                    <Target className="h-3.5 w-3.5" />
                    {done ? 'Target met' : 'Check in'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Weekly overview</CardTitle>
          <p className="text-sm text-slate-500">How each habit is tracking against its target</p>
        </CardHeader>
        <CardContent className="space-y-3.5">
          {habitList.map((habit) => {
            const percent = Math.round((habit.completed_days / habit.target_per_week) * 100)
            return (
              <div key={habit.id}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">{habit.name}</span>
                  <span className="text-slate-500">{percent}%</span>
                </div>
                <Progress value={percent} size="sm" />
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a habit"
        description="Start small — a habit you can repeat is better than one you cannot."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="create-habit-form" isLoading={isSubmitting}>
              <Plus className="h-4 w-4" />
              Create habit
            </Button>
          </>
        }
      >
        <form id="create-habit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Habit name" placeholder="Fajr on time" error={errors.name?.message} {...register('name')} />
          <Textarea
            label="Description (optional)"
            placeholder="What does success look like?"
            error={errors.description?.message}
            {...register('description')}
          />
          <Input
            label="Target days per week"
            type="number"
            min={1}
            max={7}
            error={errors.target_per_week?.message}
            {...register('target_per_week')}
          />
        </form>
      </Modal>
    </div>
  )
}
