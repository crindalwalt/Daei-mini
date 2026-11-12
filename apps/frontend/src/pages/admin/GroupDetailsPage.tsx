import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Plus,
  Target,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react'
import { StatCard } from '../../components/shared/StatCard'
import { ActivityStatusBadge, ActivityTypeBadge, UserStatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { formatDate, formatTime } from '../../lib/format'

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function GroupDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [draft, setDraft] = useState({ name: '', email: '' })

  const groupQuery = useQuery({
    queryKey: ['admin', 'group', id],
    queryFn: () => adminApi.groups.get(id ?? ''),
    enabled: Boolean(id),
    staleTime: 15_000,
  })

  const activitiesQuery = useQuery({
    queryKey: ['admin', 'group-activities', id],
    queryFn: () => adminApi.activities.list({ per_page: 100 }),
    enabled: Boolean(id),
    staleTime: 30_000,
  })

  const group = groupQuery.data
  const members = useMemo(() => group?.members ?? [], [group])

  const avgProgress = useMemo(
    () =>
      members.length === 0
        ? 0
        : Math.round(members.reduce((sum, member) => sum + (member.progress ?? 0), 0) / members.length),
    [members]
  )

  const assignedActivities = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id))
    return (activitiesQuery.data?.items ?? [])
      .filter((activity) => activity.user_id !== undefined && memberIds.has(activity.user_id))
      .slice(0, 8)
  }, [activitiesQuery.data, members])

  const addMember = useMutation({
    mutationFn: () => {
      if (!group) throw new Error('Group is not loaded yet.')
      return adminApi.users.create({
        name: draft.name.trim(),
        email: draft.email.trim(),
        role: 'user',
        group_id: group.id,
        status: 'pending',
        send_invitation: true,
      })
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'group', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      setDraft({ name: '', email: '' })
      setModalOpen(false)
      if (result.invitation_sent) {
        toast.success(`${result.user.name} was added and invited by email.`, 'Member added')
      } else {
        toast.info(`${result.user.name} was added, but the invitation email could not be sent.`, 'Member added')
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not add the member.'), 'Unable to add member')
    },
  })

  const submitMember = () => {
    if (!draft.name.trim() || !draft.email.trim()) {
      toast.error('Enter a name and email address to add a member.')
      return
    }
    addMember.mutate()
  }

  if (!id) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Group not found"
        description="No group identifier was provided."
        action={<Link to="/admin/groups"><Button variant="outline" size="sm">Back to groups</Button></Link>}
      />
    )
  }

  if (groupQuery.isLoading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading group…</div>
  }

  if (groupQuery.isError || !group) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Could not load this group"
        description={errorMessage(groupQuery.error, 'The group may have been removed.')}
        action={<Link to="/admin/groups"><Button variant="outline" size="sm">Back to groups</Button></Link>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/groups"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to groups
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-card sm:p-8">
        <div className="pattern-dots absolute inset-0 opacity-25" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
              <UsersRound className="h-7 w-7" />
            </div>
            <div>
              <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-50">
                {group.members_count} members
              </span>
              <h1 className="mt-2 text-2xl font-bold tracking-tight">{group.name}</h1>
              <p className="mt-1 max-w-xl text-sm text-brand-100/90">
                {group.description ?? 'No description provided for this group yet.'}
              </p>
              <p className="mt-2 text-xs text-brand-200">
                Led by {group.leader ?? 'an unassigned leader'} · created{' '}
                {group.created_at ? formatDate(group.created_at) : 'recently'}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            className="bg-white text-brand-800 hover:bg-brand-50"
            onClick={() => setModalOpen(true)}
          >
            <UserPlus className="h-4 w-4" />
            Add member
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Members" value={members.length} icon={Users} hint="in this group" />
        <StatCard label="Activities" value={group.activities_count} icon={CalendarDays} accent="sky" hint="assigned this month" />
        <StatCard label="Average progress" value={`${avgProgress}%`} icon={Target} accent="emerald" hint="member completion" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div>
              <CardTitle>Members</CardTitle>
              <p className="mt-1 text-sm text-slate-500">Progress for each member in this group</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {members.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No members yet. Use “Add member” to invite the first member.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Progress</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <Link to={`/admin/users/${member.id}`} className="flex items-center gap-3">
                          <Avatar name={member.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800 hover:text-brand-700">
                              {member.name}
                            </p>
                            <p className="truncate text-xs text-slate-500">{member.email}</p>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell><UserStatusBadge status={member.status} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDate(member.joined_at)}
                      </TableCell>
                      <TableCell className="min-w-32">
                        <Progress value={member.progress ?? 0} size="sm" />
                        <p className="mt-1 text-[10px] font-medium text-slate-400">{member.progress ?? 0}%</p>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle>Group completion</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <CircularProgress value={group.progress} size={140} strokeWidth={11} />
              <p className="text-center text-xs text-slate-500">
                {group.progress}% average report score across this group.
              </p>
              <div className="w-full space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-slate-500">
                  <span>Activities logged</span>
                  <span className="font-semibold text-slate-800">{group.activities_count}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Members</span>
                  <span className="font-semibold text-slate-800">{members.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Group created', done: true },
                { label: 'First member added', done: members.length >= 1 },
                { label: '80% average completion', done: group.progress >= 80 },
                { label: 'Monthly review', done: false },
              ].map((milestone) => (
                <div key={milestone.label} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={
                      milestone.done
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600'
                        : 'flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400'
                    }
                  >
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                  <span className={milestone.done ? 'text-slate-700' : 'text-slate-400'}>
                    {milestone.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent member activities</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0 sm:px-0">
          {assignedActivities.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">
              No activities have been logged by this group's members yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignedActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell className="font-medium text-slate-800">{activity.title}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-600">
                      {activity.user_name ?? 'Member'}
                    </TableCell>
                    <TableCell><ActivityTypeBadge type={activity.activity_type} /></TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(activity.scheduled_date)} · {formatTime(activity.start_time)}
                    </TableCell>
                    <TableCell><ActivityStatusBadge status={activity.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setDraft({ name: '', email: '' })
        }}
        title={`Add a member to ${group.name}`}
        description="New members start as pending until they accept the emailed invitation."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                setDraft({ name: '', email: '' })
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitMember} isLoading={addMember.isPending}>
              <UserPlus className="h-4 w-4" />
              Add member
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full name"
            placeholder="Member name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Email address"
            type="email"
            placeholder="member@example.com"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            An invitation email with a six-digit code will be sent. It expires after 15 minutes.
          </p>
        </div>
      </Modal>
    </div>
  )
}
