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
  User as UserIcon,
} from 'lucide-react'
import { ReportStatusBadge, ScoreBadge } from '../../components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { CircularProgress, Progress } from '../../components/ui/Progress'
import { Textarea } from '../../components/ui/Textarea'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { adminReports, adminUsers, reportComments } from '../../lib/mockData'
import { formatDate, formatDateTime, formatTime } from '../../lib/format'
import type { ReportComment } from '../../types/domain'

export function ReportDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { user } = useAuth()
  const baseReport = adminReports.find((report) => report.id === Number(id)) ?? adminReports[0]
  const [report, setReport] = useState(baseReport)
  const [comments, setComments] = useState<ReportComment[]>(reportComments)
  const [comment, setComment] = useState('')

  const member = adminUsers.find((item) => item.id === report.user_id) ?? adminUsers[0]
  const scheduled = report.scheduled_count ?? 0
  const completed = report.completed_count ?? 0
  const score = report.calculated_score ?? 0
  const zeroEdgeCase = scheduled === 0

  const submitComment = () => {
    if (!comment.trim()) {
      toast.error('Write a comment before sending.')
      return
    }
    setComments((current) => [
      ...current,
      {
        id: Date.now(),
        author: user?.name ?? 'Administrator',
        role: 'Administrator',
        comment: comment.trim(),
        created_at: new Date().toISOString(),
      },
    ])
    setComment('')
    toast.success('Comment added to the report.', 'Feedback sent')
  }

  const markReviewed = () => {
    setReport((current) => ({ ...current, status: 'reviewed' }))
    toast.success('Report marked as reviewed.')
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/reports"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to daily reports
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600">
            Daily report
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            {formatDate(report.report_date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <ReportStatusBadge status={report.status} />
            <span>Submitted by {report.user_name}</span>
            <span>·</span>
            <span>{formatDateTime(report.created_at ?? new Date().toISOString())}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.status !== 'reviewed' && (
            <Button size="sm" onClick={markReviewed}>
              <CheckCircle2 className="h-4 w-4" />
              Mark reviewed
            </Button>
          )}
          <Link to={`/admin/users/${member.id}`}>
            <Button variant="outline" size="sm">
              <UserIcon className="h-4 w-4" />
              View member
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Daily summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                {report.summary ?? 'No summary was provided for this report.'}
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
              <CardTitle>Activity snapshot</CardTitle>
              <p className="text-sm text-slate-500">
                Scores are calculated from scheduled and completed activities.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <CalendarDays className="h-3.5 w-3.5" /> Scheduled
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{scheduled}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{completed}</p>
                </div>
                <div className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Clock3 className="h-3.5 w-3.5" /> Score
                  </div>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{score.toFixed(2)}%</p>
                </div>
              </div>

              {zeroEdgeCase ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    No activities were scheduled for this day, so the calculated score is exactly{' '}
                    <span className="font-semibold">0.00%</span>. This is an edge case, not a
                    performance failure.
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

              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Activity</th>
                      <th className="px-4 py-2.5 font-semibold">Time</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[
                      { title: 'Fajr prayer', time: '05:42', done: true },
                      { title: 'Quran reading', time: '06:15', done: true },
                      { title: 'Morning run', time: '07:15', done: completed > 2 },
                      { title: 'Tafseer study', time: '16:00', done: completed > 3 },
                    ].map((activity) => (
                      <tr key={activity.title}>
                        <td className="px-4 py-2.5 text-slate-700">{activity.title}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{formatTime(activity.time)}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant={activity.done ? 'success' : 'secondary'}>
                            {activity.done ? 'Completed' : 'Not logged'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <div className="mt-4 flex items-center gap-2">
                <ScoreBadge score={score} />
                <ReportStatusBadge status={report.status} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Member</CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/admin/users/${member.id}`} className="flex items-center gap-3">
                <Avatar name={member.name} size="lg" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800 hover:text-brand-700">{member.name}</p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-400">{member.group}</p>
                </div>
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-lg font-bold text-slate-900">{member.activities ?? 0}</p>
                  <p className="text-[10px] text-slate-500">Activities</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-2.5">
                  <p className="text-lg font-bold text-slate-900">{member.progress ?? 0}%</p>
                  <p className="text-[10px] text-slate-500">Progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Comments</CardTitle>
              <Badge variant="secondary">{comments.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((item) => (
                    <div key={item.id} className="flex gap-2.5">
                      <Avatar name={item.author} size="sm" />
                      <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-semibold text-slate-800">{item.author}</p>
                          <span className="text-[10px] text-slate-400">{formatDateTime(item.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t border-slate-100 pt-4">
                <Textarea
                  placeholder="Leave constructive feedback for this member…"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="min-h-20"
                />
                <Button size="sm" className="w-full" onClick={submitComment}>
                  <Send className="h-3.5 w-3.5" />
                  Add comment
                </Button>
                <p className="flex items-center gap-1 text-[10px] text-slate-400">
                  <MessageSquare className="h-3 w-3" />
                  Members are notified when you comment.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
