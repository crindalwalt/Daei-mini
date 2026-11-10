import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  MessageSquare,
  Send,
} from 'lucide-react'
import { ReportStatusBadge, ScoreBadge } from '../../components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { reportComments, userReports } from '../../lib/mockData'
import { formatDate, formatDateTime } from '../../lib/format'
import type { ReportComment } from '../../types/domain'

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { user } = useAuth()
  const report = userReports.find((item) => item.id === Number(id)) ?? userReports[0]
  const [comments, setComments] = useState<ReportComment[]>(reportComments)
  const [comment, setComment] = useState('')

  const scheduled = report.scheduled_count ?? 0
  const completed = report.completed_count ?? 0
  const score = report.calculated_score ?? 0
  const zeroEdgeCase = scheduled === 0

  const addComment = () => {
    if (!comment.trim()) {
      toast.error('Write a comment before sending.')
      return
    }
    setComments((current) => [
      ...current,
      {
        id: Date.now(),
        author: user?.name ?? 'You',
        role: 'User',
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      },
    ])
    setComment('')
    toast.success('Your reply was added.')
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Daily report
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatDate(report.report_date, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <ReportStatusBadge status={report.status} />
            <ScoreBadge score={score} />
          </div>
        </div>
        <Link to="/app/reports/new">
          <Button size="sm">
            <ClipboardList className="h-4 w-4" />
            Write a new report
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                {report.summary ?? 'No summary was provided.'}
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Self assessment
                </p>
                <p className="mt-1.5 text-sm text-slate-600">
                  {report.self_assessment ?? 'No self assessment provided.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Score breakdown</CardTitle>
              <p className="text-sm text-slate-500">
                Your score is calculated from activities scheduled and completed that day.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" /> Scheduled
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{scheduled}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{completed}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" /> Score
                  </p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{score.toFixed(2)}%</p>
                </div>
              </div>

              {zeroEdgeCase ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    No activities were scheduled on this day, so the calculated score is exactly{' '}
                    <span className="font-semibold">0.00%</span>. This is an expected edge case and
                    not a reflection of your effort.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
                    <span>Completion</span>
                    <span className="font-semibold text-slate-700">
                      {completed} of {scheduled} activities
                    </span>
                  </div>
                  <Progress value={score} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardContent className="flex flex-col items-center p-6">
              <CircularProgress
                value={score}
                size={148}
                strokeWidth={11}
                barClassName={zeroEdgeCase ? 'stroke-slate-300' : undefined}
              >
                <span className="text-2xl font-bold text-slate-900">{score.toFixed(2)}%</span>
                <span className="text-[11px] font-medium text-slate-500">
                  {zeroEdgeCase ? 'No activities' : 'Calculated score'}
                </span>
              </CircularProgress>
              <p className="mt-3 text-center text-xs text-slate-500">
                {zeroEdgeCase
                  ? 'Edge case: zero scheduled activities always yields 0.00%.'
                  : 'Calculated from the activities logged for this day.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Feedback</CardTitle>
              <MessageSquare className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">No feedback yet.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((item) => (
                    <div key={item.id} className="flex gap-2.5">
                      <Avatar name={item.author} size="sm" />
                      <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-800">{item.author}</p>
                          <span className="text-[10px] text-slate-400">
                            {formatDateTime(item.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Textarea
                  placeholder="Reply to your administrator…"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="min-h-20"
                />
                <Button size="sm" className="w-full" onClick={addComment}>
                  <Send className="h-3.5 w-3.5" />
                  Add reply
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
