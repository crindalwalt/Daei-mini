import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Info,
  Send,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Alert } from '../../components/ui/Alert'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { reportsApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'
import { todayISO } from '../../lib/format'

const reportSchema = z
  .object({
    report_date: z.string().min(1, 'Choose the report date'),
    scheduled_count: z.coerce
      .number()
      .int('Use a whole number')
      .min(0, 'Cannot be negative')
      .max(100, 'That seems too high'),
    completed_count: z.coerce
      .number()
      .int('Use a whole number')
      .min(0, 'Cannot be negative')
      .max(100, 'That seems too high'),
    summary: z.string().min(20, 'Write at least 20 characters summarising your day'),
    self_assessment: z
      .string()
      .min(10, 'Add a short self assessment (at least 10 characters)'),
  })
  .refine((data) => data.completed_count <= data.scheduled_count, {
    message: 'Completed activities cannot exceed the number scheduled',
    path: ['completed_count'],
  })

type ReportFormInput = z.input<typeof reportSchema>
type ReportValues = z.output<typeof reportSchema>

export function DailyReportFormPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormInput, unknown, ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      report_date: todayISO(),
      scheduled_count: 6,
      completed_count: 4,
      summary: '',
      self_assessment: '',
    },
  })

  const scheduled = Number(watch('scheduled_count')) || 0
  const completed = Number(watch('completed_count')) || 0
  const zeroScheduled = scheduled === 0
  const previewScore = useMemo(() => {
    if (scheduled === 0) return 0
    return Math.min(100, (completed / scheduled) * 100)
  }, [scheduled, completed])

  const onSubmit = async (values: ReportValues) => {
    try {
      // The API derives scheduled/completed counts and the score from the
      // activity snapshot, so only the documented fields are sent.
      await reportsApi.create({
        report_date: values.report_date,
        summary: values.summary,
        self_assessment: values.self_assessment,
      })
      toast.success('Your daily report has been submitted.', 'Report sent')
      navigate('/app/reports')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, messages]) => {
            setError(field as keyof ReportValues, { type: 'server', message: messages[0] })
          })
        } else {
          toast.error(err.message, 'Could not submit report')
        }
      } else {
        toast.info('Saved locally. The API is unreachable right now.', 'Offline mode')
        navigate('/app/reports')
      }
    }
  }

  return (
    <div className="space-y-6">
      <Link
        to="/app/reports"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to report history
      </Link>

      <PageHeader
        eyebrow="Records"
        title="Daily report"
        description="Log how today went. Your score is calculated automatically from scheduled and completed activities."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Tell us about your day</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Report date"
                type="date"
                error={errors.report_date?.message}
                {...register('report_date')}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Activities scheduled"
                  type="number"
                  min={0}
                  error={errors.scheduled_count?.message}
                  {...register('scheduled_count')}
                />
                <Input
                  label="Activities completed"
                  type="number"
                  min={0}
                  error={errors.completed_count?.message}
                  {...register('completed_count')}
                />
              </div>
              <Textarea
                label="Day summary"
                placeholder="What did you do today? What stood out?"
                error={errors.summary?.message}
                {...register('summary')}
              />
              <Textarea
                label="Self assessment"
                placeholder="How do you feel about today? What will you adjust tomorrow?"
                error={errors.self_assessment?.message}
                {...register('self_assessment')}
              />

              {zeroScheduled && (
                <Alert variant="warning" title="No activities scheduled">
                  With zero scheduled activities, the calculated score will be exactly{' '}
                  <span className="font-semibold">0.00%</span>. This is an edge case, not a judgment
                  on your day.
                </Alert>
              )}

              <div className="flex flex-wrap justify-end gap-2.5 pt-1">
                <Link to="/app/reports">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" isLoading={isSubmitting}>
                  <Send className="h-4 w-4" />
                  Submit report
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Live score preview</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <CircularProgress
                value={previewScore}
                size={148}
                strokeWidth={11}
                barClassName={zeroScheduled ? 'stroke-slate-300' : undefined}
              >
                <span className="text-2xl font-bold text-slate-900">{previewScore.toFixed(2)}%</span>
                <span className="text-[11px] font-medium text-slate-500">
                  {zeroScheduled ? 'No activities' : 'Preview'}
                </span>
              </CircularProgress>
              <div className="w-full space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Scheduled</span>
                  <span className="font-semibold text-slate-800">{scheduled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Completed</span>
                  <span className="font-semibold text-emerald-600">{completed}</span>
                </div>
                <Progress value={previewScore} size="sm" />
              </div>
              {zeroScheduled ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Zero scheduled activities produces exactly 0.00% by design.
                </div>
              ) : (
                <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  The final score is recalculated by the server when you submit.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Report tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p className="flex gap-2">
                <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Submit the report on the same day where possible.
              </p>
              <p className="flex gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Be honest about missed activities — the data helps you improve.
              </p>
              <p className="flex gap-2">
                <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
                Your group administrator may leave feedback on the report.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
