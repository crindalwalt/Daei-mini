import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Activity,
  CalendarDays,
  Droplets,
  Dumbbell,
  Flame,
  HeartPulse,
  Moon,
  Plus,
  Scale,
  Timer,
  TrendingDown,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Progress } from '../../components/ui/Progress'
import { Tabs } from '../../components/ui/Tabs'
import { Modal } from '../../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { EmptyState } from '../../components/shared/EmptyState'
import { BarChart, LineChart } from '../../components/charts/Charts'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { exerciseRecords as seedExercises, healthRecords as seedHealth } from '../../lib/mockData'
import { formatDate, formatDateTime, todayISO } from '../../lib/format'
import { healthApi } from '../../lib/api/endpoints'
import type { ChartPoint, ExerciseRecord, HealthRecord } from '../../types/domain'

const WATER_TARGET = 2500

const healthSchema = z
  .object({
    record_date: z.string().min(1, 'Choose a date'),
    weight_kg: z.coerce
      .number()
      .min(20, 'Enter a realistic weight')
      .max(300, 'Enter a realistic weight'),
    water_ml: z.coerce.number().int('Use a whole number').min(0, 'Cannot be negative').max(10000),
    sleep_hours: z.coerce.number().min(0, 'Cannot be negative').max(24, 'At most 24 hours'),
    systolic: z.coerce.number().int().min(60, 'Too low').max(250, 'Too high'),
    diastolic: z.coerce.number().int().min(40, 'Too low').max(150, 'Too high'),
    notes: z.string().max(300, 'Keep notes under 300 characters').optional(),
  })
  .refine((data) => data.systolic > data.diastolic, {
    message: 'Systolic must be higher than diastolic',
    path: ['systolic'],
  })

const exerciseSchema = z.object({
  title: z.string().min(3, 'Give the session a title (at least 3 characters)'),
  exercise_type: z.string().min(1, 'Choose a type'),
  duration_minutes: z.coerce.number().int().min(1, 'At least 1 minute').max(600, 'At most 600 minutes'),
  calories_burned: z.coerce.number().int().min(0, 'Cannot be negative').max(5000, 'Too high'),
  recorded_at: z.string().min(1, 'Choose a date'),
  notes: z.string().max(300, 'Keep notes under 300 characters').optional(),
})

type HealthFormInput = z.input<typeof healthSchema>
type HealthValues = z.output<typeof healthSchema>
type ExerciseFormInput = z.input<typeof exerciseSchema>
type ExerciseValues = z.output<typeof exerciseSchema>

const exerciseTypes = ['Run', 'Walk', 'Strength', 'Yoga', 'Cycling', 'Swim', 'Sports', 'Other']

export function HealthFitnessPage() {
  const toast = useToast()
  const [records, setRecords] = useState<HealthRecord[]>(seedHealth)
  const [exercises, setExercises] = useState<ExerciseRecord[]>(seedExercises)
  const [tab, setTab] = useState('overview')
  const [healthOpen, setHealthOpen] = useState(false)
  const [exerciseOpen, setExerciseOpen] = useState(false)

  const latest = records[0]

  const healthForm = useForm<HealthFormInput, unknown, HealthValues>({
    resolver: zodResolver(healthSchema),
    defaultValues: {
      record_date: todayISO(),
      weight_kg: latest?.weight_kg ?? 72,
      water_ml: latest?.water_ml ?? 2000,
      sleep_hours: latest?.sleep_hours ?? 7,
      systolic: latest?.blood_pressure_systolic ?? 120,
      diastolic: latest?.blood_pressure_diastolic ?? 78,
      notes: '',
    },
  })

  const exerciseForm = useForm<ExerciseFormInput, unknown, ExerciseValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      title: '',
      exercise_type: 'Run',
      duration_minutes: 30,
      calories_burned: 250,
      recorded_at: todayISO(),
      notes: '',
    },
  })

  const stats = useMemo(() => {
    const week = records.slice(0, 7)
    const avgSleep =
      week.length === 0
        ? 0
        : week.reduce((sum, record) => sum + (record.sleep_hours ?? 0), 0) / week.length
    const avgWater =
      week.length === 0
        ? 0
        : Math.round(week.reduce((sum, record) => sum + (record.water_ml ?? 0), 0) / week.length)
    const totalCalories = exercises.reduce((sum, item) => sum + item.calories_burned, 0)
    const totalMinutes = exercises.reduce((sum, item) => sum + item.duration_minutes, 0)
    const previousWeight = records[1]?.weight_kg ?? latest?.weight_kg ?? 0
    const weightDelta = (latest?.weight_kg ?? 0) - previousWeight
    return { avgSleep, avgWater, totalCalories, totalMinutes, weightDelta }
  }, [records, exercises, latest])

  const weightTrend: ChartPoint[] = useMemo(
    () =>
      [...records]
        .slice(0, 7)
        .reverse()
        .map((record) => ({
          label: formatDate(record.record_date, { day: '2-digit', month: 'short' }),
          value: record.weight_kg ?? 0,
        })),
    [records]
  )

  const waterTrend: ChartPoint[] = useMemo(
    () =>
      [...records]
        .slice(0, 7)
        .reverse()
        .map((record) => ({
          label: formatDate(record.record_date, { day: '2-digit', month: 'short' }),
          value: record.water_ml ?? 0,
          secondary: 2500,
        })),
    [records]
  )

  const sleepTrend: ChartPoint[] = useMemo(
    () =>
      [...records]
        .slice(0, 7)
        .reverse()
        .map((record) => ({
          label: formatDate(record.record_date, { day: '2-digit', month: 'short' }),
          value: record.sleep_hours ?? 0,
        })),
    [records]
  )

  const onSaveHealth = async (values: HealthValues) => {
    const record: HealthRecord = {
      id: Date.now(),
      record_date: values.record_date,
      weight_kg: values.weight_kg,
      water_ml: values.water_ml,
      sleep_hours: values.sleep_hours,
      blood_pressure_systolic: values.systolic,
      blood_pressure_diastolic: values.diastolic,
      notes: values.notes ?? null,
    }
    try {
      const { id: _localId, ...payload } = record
      void _localId
      await healthApi.create(payload)
      toast.success('Your health record has been saved.', 'Record logged')
    } catch {
      toast.info('Saved locally. The API is unreachable right now.', 'Offline mode')
    }
    setRecords((current) => [record, ...current])
    setHealthOpen(false)
    healthForm.reset({
      record_date: todayISO(),
      weight_kg: values.weight_kg,
      water_ml: values.water_ml,
      sleep_hours: values.sleep_hours,
      systolic: values.systolic,
      diastolic: values.diastolic,
      notes: '',
    })
  }

  const onSaveExercise = async (values: ExerciseValues) => {
    const exercise: ExerciseRecord = {
      id: Date.now(),
      title: values.title,
      exercise_type: values.exercise_type,
      duration_minutes: values.duration_minutes,
      calories_burned: values.calories_burned,
      recorded_at: new Date(`${values.recorded_at}T09:00:00`).toISOString(),
      notes: values.notes ?? null,
    }
    try {
      const { id: _localId, ...payload } = exercise
      void _localId
      await healthApi.createExercise(payload)
      toast.success('Exercise session logged.', 'Session saved')
    } catch {
      toast.info('Saved locally. The API is unreachable right now.', 'Offline mode')
    }
    setExercises((current) => [exercise, ...current])
    setExerciseOpen(false)
    exerciseForm.reset()
  }

  const waterToday = latest?.water_ml ?? 0
  const waterPercent = Math.round((waterToday / WATER_TARGET) * 100)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Health & fitness"
        description="Track hydration, sleep and movement alongside your daily worship routine."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setExerciseOpen(true)}>
              <Dumbbell className="h-4 w-4" />
              Log exercise
            </Button>
            <Button size="sm" onClick={() => setHealthOpen(true)}>
              <Plus className="h-4 w-4" />
              Log record
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Weight"
          value={`${(latest?.weight_kg ?? 0).toFixed(1)} kg`}
          icon={Scale}
          hint={
            stats.weightDelta === 0
              ? 'steady this week'
              : `${stats.weightDelta > 0 ? '+' : ''}${stats.weightDelta.toFixed(1)} kg vs yesterday`
          }
        />
        <StatCard
          label="Water today"
          value={`${waterToday} ml`}
          icon={Droplets}
          accent="sky"
          hint={`${waterPercent}% of ${WATER_TARGET} ml goal`}
        />
        <StatCard
          label="Sleep last night"
          value={`${(latest?.sleep_hours ?? 0).toFixed(1)} h`}
          icon={Moon}
          accent="amber"
          hint={`${stats.avgSleep.toFixed(1)} h average this week`}
        />
        <StatCard
          label="Blood pressure"
          value={`${latest?.blood_pressure_systolic ?? '—'}/${latest?.blood_pressure_diastolic ?? '—'}`}
          icon={HeartPulse}
          accent="emerald"
          hint="mmHg · latest reading"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'overview', label: 'Overview' },
          { id: 'records', label: 'Health records', count: records.length },
          { id: 'exercise', label: 'Exercise log', count: exercises.length },
        ]}
      />

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Weight trend</CardTitle>
                <p className="text-sm text-slate-500">Last 7 recorded days</p>
              </CardHeader>
              <CardContent>
                <LineChart data={weightTrend} height={210} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hydration</CardTitle>
                <p className="text-sm text-slate-500">Daily water intake against your goal</p>
              </CardHeader>
              <CardContent>
                <BarChart data={waterTrend} height={210} showLegend />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Sleep consistency</CardTitle>
                <p className="text-sm text-slate-500">Aim for 7 to 9 hours each night</p>
              </CardHeader>
              <CardContent>
                <LineChart data={sleepTrend} height={190} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Weekly activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Droplets className="h-3.5 w-3.5 text-sky-500" />
                      Hydration
                    </span>
                    <span className="font-semibold text-slate-700">{waterPercent}%</span>
                  </div>
                  <Progress value={waterPercent} barClassName="bg-sky-500" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Moon className="h-3.5 w-3.5 text-amber-500" />
                      Sleep goal
                    </span>
                    <span className="font-semibold text-slate-700">
                      {Math.min(100, Math.round((stats.avgSleep / 8) * 100))}%
                    </span>
                  </div>
                  <Progress value={Math.min(100, Math.round((stats.avgSleep / 8) * 100))} barClassName="bg-amber-500" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <Flame className="h-3.5 w-3.5 text-brand-500" />
                      Calories burned
                    </span>
                    <span className="font-semibold text-slate-700">{stats.totalCalories}</span>
                  </div>
                  <Progress value={Math.min(100, Math.round((stats.totalCalories / 3000) * 100))} />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Timer className="h-3.5 w-3.5" />
                    Total exercise
                  </span>
                  <span className="font-semibold text-slate-700">{stats.totalMinutes} min</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Activity className="h-3.5 w-3.5" />
                    Sessions logged
                  </span>
                  <span className="font-semibold text-slate-700">{exercises.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'records' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Health records</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Most recent measurements first</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setHealthOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Log record
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Water</TableHead>
                  <TableHead>Sleep</TableHead>
                  <TableHead>Blood pressure</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(record.record_date)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">
                      {record.weight_kg ? `${record.weight_kg.toFixed(1)} kg` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {record.water_ml ? `${record.water_ml} ml` : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">
                      {record.sleep_hours ? `${record.sleep_hours.toFixed(1)} h` : '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {record.blood_pressure_systolic ?? '—'}/{record.blood_pressure_diastolic ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs text-slate-500">
                      {record.notes ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {tab === 'exercise' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Exercise log</CardTitle>
              <p className="mt-1 text-sm text-slate-500">
                {stats.totalMinutes} minutes across {exercises.length} sessions
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setExerciseOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Log exercise
            </Button>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            {exercises.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Dumbbell}
                  title="No exercise logged yet"
                  description="Add your first session to start tracking movement and calories."
                  action={
                    <Button size="sm" onClick={() => setExerciseOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Log exercise
                    </Button>
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Calories</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exercises.map((exercise) => (
                    <TableRow key={exercise.id}>
                      <TableCell className="text-sm font-semibold text-slate-800">
                        {exercise.title}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                          <Dumbbell className="h-3 w-3" />
                          {exercise.exercise_type}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {exercise.duration_minutes} min
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-600">
                        {exercise.calories_burned} kcal
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDateTime(exercise.recorded_at)}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-slate-500">
                        {exercise.notes ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: 'Weekly water average',
            value: `${stats.avgWater} ml`,
            hint: `Goal is ${WATER_TARGET} ml per day`,
            icon: Droplets,
          },
          {
            label: 'Weekly sleep average',
            value: `${stats.avgSleep.toFixed(1)} h`,
            hint: 'Aim for 7–9 hours',
            icon: Moon,
          },
          {
            label: 'Weight change',
            value: `${stats.weightDelta > 0 ? '+' : ''}${stats.weightDelta.toFixed(1)} kg`,
            hint: 'Compared with the previous record',
            icon: TrendingDown,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-3 p-5">
                <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
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

      <Modal
        open={healthOpen}
        onClose={() => setHealthOpen(false)}
        title="Log a health record"
        description="Record your measurements for the day."
        footer={
          <>
            <Button variant="outline" onClick={() => setHealthOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="health-record-form" isLoading={healthForm.formState.isSubmitting}>
              <Plus className="h-4 w-4" />
              Save record
            </Button>
          </>
        }
      >
        <form
          id="health-record-form"
          onSubmit={healthForm.handleSubmit(onSaveHealth)}
          className="space-y-4"
        >
          <Input
            label="Date"
            type="date"
            error={healthForm.formState.errors.record_date?.message}
            {...healthForm.register('record_date')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              error={healthForm.formState.errors.weight_kg?.message}
              {...healthForm.register('weight_kg')}
            />
            <Input
              label="Water (ml)"
              type="number"
              error={healthForm.formState.errors.water_ml?.message}
              {...healthForm.register('water_ml')}
            />
            <Input
              label="Sleep (hours)"
              type="number"
              step="0.1"
              error={healthForm.formState.errors.sleep_hours?.message}
              {...healthForm.register('sleep_hours')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Systolic"
              type="number"
              error={healthForm.formState.errors.systolic?.message}
              {...healthForm.register('systolic')}
            />
            <Input
              label="Diastolic"
              type="number"
              error={healthForm.formState.errors.diastolic?.message}
              {...healthForm.register('diastolic')}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            placeholder="How did you feel today?"
            error={healthForm.formState.errors.notes?.message}
            {...healthForm.register('notes')}
          />
        </form>
      </Modal>

      <Modal
        open={exerciseOpen}
        onClose={() => setExerciseOpen(false)}
        title="Log an exercise session"
        description="Add the movement you completed today."
        footer={
          <>
            <Button variant="outline" onClick={() => setExerciseOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="exercise-record-form" isLoading={exerciseForm.formState.isSubmitting}>
              <Dumbbell className="h-4 w-4" />
              Save session
            </Button>
          </>
        }
      >
        <form
          id="exercise-record-form"
          onSubmit={exerciseForm.handleSubmit(onSaveExercise)}
          className="space-y-4"
        >
          <Input
            label="Session title"
            placeholder="Morning 5km"
            error={exerciseForm.formState.errors.title?.message}
            {...exerciseForm.register('title')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Exercise type"
              error={exerciseForm.formState.errors.exercise_type?.message}
              {...exerciseForm.register('exercise_type')}
            >
              {exerciseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              error={exerciseForm.formState.errors.recorded_at?.message}
              {...exerciseForm.register('recorded_at')}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Duration (minutes)"
              type="number"
              error={exerciseForm.formState.errors.duration_minutes?.message}
              {...exerciseForm.register('duration_minutes')}
            />
            <Input
              label="Calories burned"
              type="number"
              error={exerciseForm.formState.errors.calories_burned?.message}
              {...exerciseForm.register('calories_burned')}
            />
          </div>
          <Textarea
            label="Notes (optional)"
            placeholder="How did the session feel?"
            error={exerciseForm.formState.errors.notes?.message}
            {...exerciseForm.register('notes')}
          />
        </form>
      </Modal>

      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 text-xs text-slate-500 shadow-soft">
        <CalendarDays className="h-4 w-4 text-brand-500" />
        Records are private to your account. Health data is never shared with your group.
      </div>
    </div>
  )
}
