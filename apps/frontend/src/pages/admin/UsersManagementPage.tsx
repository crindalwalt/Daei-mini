import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { adminUsers } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import type { AdminUser, UserStatus } from '../../types/domain'

const addUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: z.enum(['user', 'admin']),
  group: z.string().min(1, 'Select a group'),
  status: z.enum(['active', 'pending', 'inactive']),
})

type AddUserValues = z.infer<typeof addUserSchema>

const groupOptions = [
  { value: 'Morning Circle', label: 'Morning Circle' },
  { value: 'Evening Study', label: 'Evening Study' },
  { value: 'Health & Fitness', label: 'Health & Fitness' },
  { value: 'Hifz Programme', label: 'Hifz Programme' },
  { value: "Sisters' Circle", label: "Sisters' Circle" },
]

const PAGE_SIZE = 8

export function UsersManagementPage() {
  const toast = useToast()
  const [users, setUsers] = useState<AdminUser[]>(adminUsers)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: { name: '', email: '', role: 'user', group: groupOptions[0].value, status: 'pending' },
  })

  const filtered = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !search ||
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase()) ||
        (user.group ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesRole = role === 'all' || user.role === role
      const matchesStatus = status === 'all' || user.status === status
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, role, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageUsers = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const counts = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === 'active').length,
      pending: users.filter((user) => user.status === 'pending').length,
      admins: users.filter((user) => user.role === 'admin').length,
    }),
    [users]
  )

  const onSubmit = async (values: AddUserValues) => {
    const newUser: AdminUser = {
      id: Date.now(),
      name: values.name,
      email: values.email,
      role: values.role,
      status: values.status as UserStatus,
      group: values.group,
      joined_at: new Date().toISOString().slice(0, 10),
      last_active: undefined,
      activities: 0,
      reports: 0,
      progress: 0,
    }
    // Simulate a short network round-trip so the loading state is visible.
    await new Promise((resolve) => setTimeout(resolve, 350))
    setUsers((current) => [newUser, ...current])
    setModalOpen(false)
    reset()
    toast.success(`${values.name} has been invited to the programme.`, 'User added')
  }

  const toggleStatus = (user: AdminUser) => {
    const nextStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active'
    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, status: nextStatus } : item))
    )
    toast.info(
      `${user.name} is now ${nextStatus}.`,
      nextStatus === 'active' ? 'Account activated' : 'Account deactivated'
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Users management"
        description="Invite members, assign groups and keep accounts up to date."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => toast.info('Export started. The CSV will download shortly.')}>
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
        <StatCard label="Total users" value={counts.total} icon={Users} hint="across all groups" />
        <StatCard label="Active" value={counts.active} icon={UserCheck} accent="emerald" hint="signed in this month" />
        <StatCard label="Pending" value={counts.pending} icon={UserPlus} accent="amber" hint="awaiting activation" />
        <StatCard label="Administrators" value={counts.admins} icon={ShieldCheck} accent="sky" hint="full access" />
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

          {pageUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No users match your filters"
              description="Try a different search term or clear the filters."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setRole('all')
                    setStatus('all')
                  }}
                >
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
                {pageUsers.map((user) => (
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
                          onClick={() => toggleStatus(user)}
                          className={user.status === 'active' ? 'text-amber-600' : 'text-emerald-600'}
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
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
              Showing {pageUsers.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + pageUsers.length} of {filtered.length} users
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1}
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
                disabled={currentPage >= totalPages}
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
        onClose={() => setModalOpen(false)}
        title="Invite a new user"
        description="They will receive an email invitation to set up their account."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="add-user-form" isLoading={isSubmitting}>
              <Mail className="h-4 w-4" />
              Send invitation
            </Button>
          </>
        }
      >
        <form id="add-user-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <Select label="Group" error={errors.group?.message} options={groupOptions} {...register('group')} />
          </div>
          <Select label="Initial status" error={errors.status?.message} {...register('status')}>
            <option value="pending">Pending invitation</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            Invitations expire after 7 days. The member will appear as pending until they accept.
          </p>
        </form>
      </Modal>
    </div>
  )
}
