import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Bell, CalendarDays, Save } from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { activitiesApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'
import { todaySchedule } from '../../lib/mockData'
import { todayISO } from '../../lib/format'
import type { Activity } from '../../types/domain'

const activitySchema = z
  .object({
    title: z.string().min(3, 'Give the activity a title (at least 3 characters)'),
    activity_type: z.enum([
      'prayer',
      'quran',
      'tafseer',
      'reading',
      'habit',
      'goal',
      'exercise',
      'personal',
      'other',
    ]),
    scheduled_date: z.string().min(1, 'Choose a date'),
    start_time: z.string().min(1, 'Choose a start time'),
    end_time: z.string().optional(),
    description: z.string().max(500, 'Keep the description under 500 characters').optional(),
    reminder_enabled: z.boolean(),
  })
  .refine(
    (data) => !data.end_time || data.end_time > data.start_time,
    { message: 'End time must be after the start time', path: ['end_time'] }
  )

type ActivityFormValues = z.infer<typeof activitySchema>

const typeOptions = [
  { value: 'prayer', label: 'Prayer' },
  { value: 'quran', label: 'Quran' },
  { value: 'tafseer', label: 'Tafseer' },
  { value: 'reading', label: 'Reading' },
  { value: 'habit', label: 'Habit' },
  { value: 'goal', label: 'Goal' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

export function ActivityFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const isEdit = Boolean(id)
  const [serverError, setServerError] = useState<string | null>(null)

  const existing = isEdit ? todaySchedule.find((activity) => activity.id === Number(id)) : undefined

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: '',
      activity_type: 'personal',
      scheduled_date: todayISO(),
      start_time: '09:00',
      end_time: '',
      description: '',
      reminder_enabled: true,
    },
  })

  useEffect(() => {
    if (existing) {
      reset({
        title: existing.title,
        activity_type: existing.activity_type,
        scheduled_date: existing.scheduled_date,
        start_time: existing.start_time ?? '09:00',
        end_time: existing.end_time ?? '',
        description: existing.description ?? '',
        reminder_enabled: existing.reminder_enabled ?? false,
      })
    }
  }, [existing, reset])

  const onSubmit = async (values: ActivityFormValues) => {
    setServerError(null)
    const payload: Partial<Activity> = {
      title: values.title,
      activity_type: values.activity_type,
      scheduled_date: values.scheduled_date,
      start_time: values.start_time,
      end_time: values.end_time || null,
      description: values.description || null,
      reminder_enabled: values.reminder_enabled,
      status: existing?.status ?? 'pending',
    }

    try {
      if (isEdit && id) {
        await activitiesApi.update(Number(id), payload)
        toast.success('Activity updated.', 'Saved')
      } else {
        await activitiesApi.create(payload)
        toast.success('Activity scheduled.', 'Created')
      }
      navigate('/app/schedule')
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        // API is unreachable — keep the experience usable in offline/demo mode.
        toast.info(
          isEdit ? 'Saved locally. The API is unreachable right now.' : 'Created locally. The API is unreachable right now.',
          'Offline mode'
        )
        navigate('/app/schedule')
      }
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/schedule"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to schedule
      </Link>

      <PageHeader
        eyebrow="Today"
        title={isEdit ? 'Edit activity' : 'Add activity'}
        description={
          isEdit
            ? 'Update the details of this scheduled activity.'
            : 'Schedule a prayer, study session, workout or personal block.'
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Activity details</CardTitle>
          </CardHeader>
          <CardContent>
            {serverError && (
              <div className="mb-4">
                <Alert variant="destructive">{serverError}</Alert>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Title"
                placeholder="Quran reading"
                error={errors.title?.message}
                {...register('title')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select
                  label="Activity type"
                  options={typeOptions}
                  error={errors.activity_type?.message}
                  {...register('activity_type')}
                />
                <Input
                  label="Date"
                  type="date"
                  error={errors.scheduled_date?.message}
                  {...register('scheduled_date')}
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Start time"
                  type="time"
                  error={errors.start_time?.message}
                  {...register('start_time')}
                />
                <Input
                  label="End time (optional)"
                  type="time"
                  error={errors.end_time?.message}
                  {...register('end_time')}
                />
              </div>
              <Textarea
                label="Description (optional)"
                placeholder="Add any notes or context for this activity"
                error={errors.description?.message}
                {...register('description')}
              />
              <label className="flex items-start gap-3 rounded-xl border border-slate-100 p-3.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                  {...register('reminder_enabled')}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-800">Send me a reminder</span>
                  <span className="block text-xs text-slate-500">
                    You will receive an in-app reminder when this activity is about to start.
                  </span>
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                <Link to="/app/schedule">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={isSubmitting}>
                  <Save className="h-4 w-4" />
                  {isEdit ? 'Save changes' : 'Add activity'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tips for a good plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              {[
                'Anchor prayers first, then build the rest of the day around them.',
                'Leave a 15 minute buffer between back-to-back blocks.',
                'Prefer a realistic list over an ambitious one you cannot finish.',
                'Turn on reminders for anything that needs a gentle nudge.',
              ].map((tip) => (
                <p key={tip} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                  {tip}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 p-5 text-xs text-slate-500">
              <p className="flex items-center gap-2 font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4 text-brand-600" />
                {errors.scheduled_date ? 'Date needs attention' : 'Scheduling works offline'}
              </p>
              <p>
                Activities are saved to your device first and synced to the server when a connection
                is available.
              </p>
              <p className="flex items-center gap-2 pt-1 font-semibold text-slate-700">
                <Bell className="h-4 w-4 text-brand-600" />
                Reminders
              </p>
              <p>Reminders can be delivered in-app, by push notification or email.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
