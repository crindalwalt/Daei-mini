import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Mail,
  Search,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { UserStatusBadge } from '../../components/shared/StatusBadge'
import { EmptyState } from '../../components/shared/EmptyState'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Progress } from '../../components/ui/Progress'
import { Modal } from '../../components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi, type AdminUserInput } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { formatDate } from '../../lib/format'
import type { AdminUser } from '../../types/domain'

const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['user', 'admin']),
  group_id: z.string(),
  status: z.enum(['active', 'pending', 'inactive']),
  send_invitation: z.boolean(),
})

type AddUserValues = z.infer<typeof addUserSchema>

const PAGE_SIZE = 8

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function UsersManagementPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'user',
      group_id: '',
      status: 'pending',
      send_invitation: true,
    },
  })

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, role, status, page],
    queryFn: () =>
      adminApi.users.list({
        q: debouncedSearch || undefined,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
        page,
        per_page: PAGE_SIZE,
      }),
    staleTime: 20_000,
  })

  const groupsQuery = useQuery({
    queryKey: ['admin', 'groups', 'options'],
    queryFn: () => adminApi.groups.list({ per_page: 100 }),
    staleTime: 60_000,
  })

  const users: AdminUser[] = usersQuery.data?.items ?? []
  const stats = usersQuery.data?.stats ?? { total: 0, active: 0, pending: 0, admins: 0 }
  const meta = usersQuery.data?.meta
  const currentPage = meta?.current_page ?? page
  const totalPages = Math.max(1, meta?.last_page ?? 1)
  const groupOptions = groupsQuery.data?.items ?? []

  const createUser = useMutation({
    mutationFn: (values: AddUserValues) => {
      const payload: AdminUserInput = {
        name: values.name.trim(),
        email: values.email.trim(),
        role: values.role,
        group_id: values.group_id ? Number(values.group_id) : null,
        status: values.status,
        send_invitation: values.send_invitation,
      }
      return adminApi.users.create(payload)
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      setModalOpen(false)
      reset()
      if (result.invitation_sent) {
        toast.success(
          `${result.user.name} has been added and invited by email.`,
          'User added'
        )
      } else {
        toast.info(
          `${result.user.name} was added, but the invitation email could not be sent.`,
          'User added'
        )
      }
    },
    onError: (error) => {
      if (error instanceof ApiError && error.errors) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          if (field === 'name' || field === 'email' || field === 'role' || field === 'group_id' || field === 'status') {
            setError(field, { message: messages[0] })
          }
        })
      }
      toast.error(errorMessage(error, 'Could not create the user.'), 'Unable to add user')
    },
  })

  const toggleStatus = useMutation({
    mutationFn: (user: AdminUser) => {
      if (user.status === 'pending') {
        return adminApi.users.update(user.id, { status: 'active' })
      }
      return adminApi.users.toggleStatus(user.id)
    },
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      toast.success(`${user.name} is now ${user.status}.`)
    },
    onError: (error) => {
      toast.error(errorMessage(error, 'Could not update the account.'), 'Update failed')
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await adminApi.users.export({
        q: debouncedSearch || undefined,
        role: role === 'all' ? undefined : role,
        status: status === 'all' ? undefined : status,
      })
      toast.success('The users CSV has been downloaded.')
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export users.'), 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setRole('all')
    setStatus('all')
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Users management"
        description="Invite members, assign groups and keep accounts up to date."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Add user
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total users" value={stats.total} icon={Users} hint="across all groups" />
        <StatCard label="Active" value={stats.active} icon={UserCheck} accent="emerald" hint="signed in this month" />
        <StatCard label="Pending" value={stats.pending} icon={UserPlus} accent="amber" hint="awaiting activation" />
        <StatCard label="Administrators" value={stats.admins} icon={ShieldCheck} accent="sky" hint="full access" />
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Search by name, email or group…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                aria-label="Search users"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select
                containerClassName="w-36"
                value={role}
                onChange={(event) => {
                  setRole(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by role"
              >
                <option value="all">All roles</option>
                <option value="admin">Admins</option>
                <option value="user">Members</option>
              </Select>
              <Select
                containerClassName="w-36"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                aria-label="Filter by status"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          {usersQuery.isLoading ? (
            <div className="py-12 text-center text-sm text-slate-500">Loading members…</div>
          ) : usersQuery.isError ? (
            <EmptyState
              icon={Users}
              title="Could not load members"
              description={errorMessage(usersQuery.error, 'The members list is unavailable right now.')}
              action={<Button variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>Try again</Button>}
            />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users match your filters"
              description="Try a different search term or clear the filters."
              action={
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Group</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-800 hover:text-brand-700">
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-slate-500">{user.email}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role === 'admin' ? 'Admin' : 'Member'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {user.group ?? '—'}
                    </TableCell>
                    <TableCell>
                      <UserStatusBadge status={user.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-slate-500">
                      {formatDate(user.joined_at)}
                    </TableCell>
                    <TableCell className="min-w-28">
                      <Progress value={user.progress ?? 0} size="sm" />
                      <p className="mt-1 text-[10px] font-medium text-slate-400">{user.progress ?? 0}%</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={toggleStatus.isPending && toggleStatus.variables?.id === user.id}
                          onClick={() => toggleStatus.mutate(user)}
                          className={
                            (user.is_active ?? user.status === 'active')
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {(user.is_active ?? user.status === 'active') ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-500">
            <p>
              Showing {users.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + users.length} of {meta?.total ?? users.length} users
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || usersQuery.isFetching}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage >= totalPages || usersQuery.isFetching}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          reset()
        }}
        title="Invite a new user"
        description="They will receive an email invitation to set up their account."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setModalOpen(false)
                reset()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" isLoading={createUser.isPending}>
              <Mail className="h-4 w-4" />
              Send invitation
            </Button>
          </>
        }
      >
        <form
          id="add-user-form"
          onSubmit={handleSubmit((values) => createUser.mutate(values))}
          className="space-y-4"
        >
          <Input
            label="Full name"
            placeholder="Aisha Rahman"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email address"
            type="email"
            placeholder="aisha@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Role" error={errors.role?.message} {...register('role')}>
              <option value="user">Member</option>
              <option value="admin">Administrator</option>
            </Select>
            <Select label="Group" error={errors.group_id?.message} {...register('group_id')}>
              <option value="">No group</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </div>
          <Select label="Initial status" error={errors.status?.message} {...register('status')}>
            <option value="pending">Pending invitation</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              {...register('send_invitation')}
            />
            <span>
              Email a one-time invitation code. It expires after 15 minutes and the member appears as
              pending until they set a password.
            </span>
          </label>
        </form>
      </Modal>
    </div>
  )
}
