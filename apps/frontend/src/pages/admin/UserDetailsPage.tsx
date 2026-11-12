import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserX,
} from 'lucide-react'
import { StatCard } from '../../components/shared/StatCard'
import {
  ActivityStatusBadge,
  ActivityTypeBadge,
  ReportStatusBadge,
  ScoreBadge,
  UserStatusBadge,
} from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Progress, CircularProgress } from '../../components/ui/Progress'
import { Tabs } from '../../components/ui/Tabs'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi, type AdminUserInput } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { formatDate, formatDateTime, formatTime } from '../../lib/format'

interface ProfileDraft {
  name: string
  email: string
  role: 'admin' | 'user'
  group_id: string
  status: 'active' | 'pending' | 'inactive'
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function UserDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [draft, setDraft] = useState<ProfileDraft>({
    name: '',
    email: '',
    role: 'user',
    group_id: '',
    status: 'active',
  })

  const userQuery = useQuery({
    queryKey: ['admin', 'user', id],
    queryFn: () => adminApi.users.get(id ?? ''),
    enabled: Boolean(id),
    staleTime: 15_000,
  })

  const groupsQuery = useQuery({
    queryKey: ['admin', 'groups', 'options'],
    queryFn: () => adminApi.groups.list({ per_page: 100 }),
    staleTime: 60_000,
  })

  const profile = userQuery.data?.user
  const reports = userQuery.data?.reports ?? []
  const activities = userQuery.data?.activities ?? []
  const groupOptions = groupsQuery.data?.items ?? []

  useEffect(() => {
    if (!profile) return
    const editableStatus: ProfileDraft['status'] =
      profile.status === 'suspended'
        ? profile.invited_at && !profile.invitation_accepted_at
          ? 'pending'
          : profile.is_active === false
            ? 'inactive'
            : 'active'
        : profile.status

    setDraft({
      name: profile.name,
      email: profile.email,
      role: profile.role,
      group_id: profile.groups?.[0] ? String(profile.groups[0].id) : '',
      status: editableStatus,
    })
  }, [profile])

  const updateUser = useMutation({
    mutationFn: (values: ProfileDraft) => {
      const payload: Partial<AdminUserInput> = {
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        group_id: values.group_id ? Number(values.group_id) : null,
        status: values.status,
      }
      return adminApi.users.update(id ?? '', payload)
    },
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] })
      setEditOpen(false)
      toast.success('Profile details updated.', 'Saved')
      void user
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the profile.'), 'Update failed')
    },
  })

  const toggleStatus = useMutation({
    mutationFn: () =>
      profile?.status === 'pending'
        ? adminApi.users.update(id ?? '', { status: 'active' })
        : adminApi.users.toggleStatus(id ?? ''),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      toast.success(`${user.name} is now ${user.status}.`)
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the account.'), 'Update failed')
    },
  })

  const toggleSuspension = useMutation({
    mutationFn: () => adminApi.users.toggleSuspension(id ?? ''),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'user', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] })
      setSuspendOpen(false)

      if (user.status === 'suspended') {
        toast.success(`${user.name} can no longer access the system.`, 'User suspended')
      } else {
        toast.success(`${user.name} can access the system again.`, 'Suspension lifted')
      }
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the suspension.'), 'Update failed')
    },
  })

  const isSuspended = profile?.status === 'suspended'
  const isActive = profile?.is_active ?? profile?.status === 'active'

  if (!id) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="User not found"
        description="No user identifier was provided."
        action={<Link to="/admin/users"><Button variant="outline" size="sm">Back to users</Button></Link>}
      />
    )
  }

  if (userQuery.isLoading) {
    return <div className="py-16 text-center text-sm text-slate-500">Loading member…</div>
  }

  if (userQuery.isError || !profile) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Could not load this member"
        description={errorMessage(userQuery.error, 'The member may have been removed.')}
        action={<Link to="/admin/users"><Button variant="outline" size="sm">Back to users</Button></Link>}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to users
      </Link>

      <Card className="overflow-hidden">
        <div className="relative h-24 bg-gradient-to-r from-brand-700 to-brand-900">
          <div className="pattern-dots absolute inset-0 opacity-30" />
        </div>
        <CardContent className="-mt-10 p-5 pt-0 sm:p-6 sm:pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <Avatar name={profile.name} size="xl" className="ring-4 ring-white" />
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">{profile.name}</h1>
                  <UserStatusBadge status={profile.status} />
                  <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                    {profile.role === 'admin' ? 'Administrator' : 'Member'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleStatus.mutate()}
                isLoading={toggleStatus.isPending}
                className={isActive ? 'text-amber-700' : 'text-emerald-700'}
              >
                <UserX className="h-3.5 w-3.5" />
                {isActive ? 'Deactivate' : 'Activate account'}
              </Button>
              <Button
                variant={isSuspended ? 'outline' : 'destructive'}
                size="sm"
                onClick={() => setSuspendOpen(true)}
                className={isSuspended ? 'text-emerald-700' : undefined}
              >
                {isSuspended ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <Ban className="h-3.5 w-3.5" />
                )}
                {isSuspended ? 'Unsuspend user' : 'Suspend user'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Activities logged" value={profile.activities ?? 0} icon={CheckCircle2} hint="all time" />
        <StatCard label="Reports submitted" value={profile.reports ?? 0} icon={ClipboardList} accent="sky" hint="all time" />
        <StatCard label="Overall progress" value={`${profile.progress ?? 0}%`} icon={CalendarDays} accent="amber" hint="last 30 days" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: 'overview', label: 'Overview' },
            { id: 'activities', label: 'Activities', count: activities.length },
            { id: 'reports', label: 'Reports', count: reports.length },
          ]}
        />
        <p className="text-xs text-slate-400">
          Last active {profile.last_active ? formatDateTime(profile.last_active) : 'never'}
        </p>
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed text-slate-600">
                {profile.bio ?? 'No profile summary yet.'}
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { icon: Mail, label: 'Email', value: profile.email },
                  { icon: Phone, label: 'Phone', value: profile.phone ?? 'Not provided' },
                  { icon: MapPin, label: 'Location', value: profile.location ?? 'Not provided' },
                  { icon: ShieldCheck, label: 'Group', value: profile.group ?? 'No group' },
                  { icon: CalendarDays, label: 'Joined', value: formatDate(profile.joined_at) },
                  { icon: ClipboardList, label: 'Reports', value: `${profile.reports ?? 0} submitted` },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <div key={item.label} className="flex items-start gap-2.5 rounded-xl border border-slate-100 p-3">
                      <Icon className="mt-0.5 h-4 w-4 text-brand-600" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {item.label}
                        </p>
                        <p className="truncate text-sm text-slate-700">{item.value}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <CircularProgress value={profile.progress ?? 0} size={132} strokeWidth={11}>
                  <span className="text-2xl font-bold text-slate-900">{profile.progress ?? 0}%</span>
                  <span className="text-[11px] font-medium text-slate-500">Completion</span>
                </CircularProgress>
                <div className="w-full space-y-3 text-sm">
                  <div className="flex justify-between text-slate-500">
                    <span>Activities</span>
                    <span className="font-semibold text-slate-800">{profile.activities ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Reports</span>
                    <span className="font-semibold text-slate-800">{profile.reports ?? 0}</span>
                  </div>
                </div>
                <Link to="/admin/reports" className="w-full">
                  <Button variant="soft" size="sm" className="w-full">
                    View reports
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Email verified</span>
                  <Badge variant={profile.email_verified ? 'success' : 'warning'}>
                    {profile.email_verified ? 'Yes' : 'No'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Invitation</span>
                  <Badge variant={profile.status === 'pending' ? 'warning' : 'success'}>
                    {profile.status === 'pending' ? 'Pending' : 'Accepted'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last active</span>
                  <span className="text-xs font-medium text-slate-700">
                    {profile.last_active ? formatDateTime(profile.last_active) : 'Never'}
                  </span>
                </div>
                <Progress value={profile.progress ?? 0} size="sm" className="pt-1" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === 'activities' && (
        <Card>
          <CardHeader>
            <CardTitle>Recent activities</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {activities.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No activities logged by this member yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium text-slate-800">{activity.title}</TableCell>
                      <TableCell><ActivityTypeBadge type={activity.activity_type} /></TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDate(activity.scheduled_date)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatTime(activity.start_time)}
                      </TableCell>
                      <TableCell><ActivityStatusBadge status={activity.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'reports' && (
        <Card>
          <CardHeader>
            <CardTitle>Submitted reports</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0 sm:px-0">
            {reports.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No reports submitted by this user yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="whitespace-nowrap text-xs text-slate-500">
                        {formatDate(report.report_date)}
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-slate-600">
                        {report.summary}
                      </TableCell>
                      <TableCell><ScoreBadge score={report.calculated_score} /></TableCell>
                      <TableCell><ReportStatusBadge status={report.status} /></TableCell>
                      <TableCell className="text-right">
                        <Link to={`/admin/reports/${report.id}`}>
                          <Button variant="ghost" size="sm">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Modal
        open={suspendOpen}
        onClose={() => {
          if (!toggleSuspension.isPending) setSuspendOpen(false)
        }}
        title={isSuspended ? 'Unsuspend this user?' : 'Suspend this user?'}
        description={
          isSuspended
            ? 'The account will be able to sign in and use the system again.'
            : 'The account will immediately lose access to the system. Their active sessions and tokens will be revoked.'
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setSuspendOpen(false)}
              disabled={toggleSuspension.isPending}
            >
              Cancel
            </Button>
            <Button
              variant={isSuspended ? 'default' : 'destructive'}
              onClick={() => toggleSuspension.mutate()}
              isLoading={toggleSuspension.isPending}
            >
              {isSuspended ? 'Unsuspend user' : 'Suspend user'}
            </Button>
          </>
        }
      >
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">{profile.name}</p>
          <p className="mt-1 text-xs text-slate-500">{profile.email}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {isSuspended
              ? 'Suspension is separate from deactivation, so the current active/inactive state is preserved.'
              : 'Suspension is separate from deactivation: this is not a status change and can be reversed later.'}
          </p>
        </div>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit profile"
        description="Update the member's account details, group and status."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={() => updateUser.mutate(draft)}
              isLoading={updateUser.isPending}
            >
              Save changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full name"
            value={draft.name}
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
          />
          <Input
            label="Email address"
            type="email"
            value={draft.email}
            onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Role"
              value={draft.role}
              onChange={(event) =>
                setDraft((current) => ({ ...current, role: event.target.value as 'admin' | 'user' }))
              }
            >
              <option value="user">Member</option>
              <option value="admin">Administrator</option>
            </Select>
            <Select
              label="Status"
              value={draft.status}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  status: event.target.value as 'active' | 'pending' | 'inactive',
                }))
              }
            >
              <option value="active">Active</option>
              <option value="pending">Pending invitation</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <Select
            label="Group"
            value={draft.group_id}
            onChange={(event) => setDraft((current) => ({ ...current, group_id: event.target.value }))}
          >
            <option value="">No group</option>
            {groupOptions.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </div>
  )
}
