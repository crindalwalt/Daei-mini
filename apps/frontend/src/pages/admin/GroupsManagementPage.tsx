import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Sparkles,
  Users,
  UsersRound,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { StatCard } from '../../components/shared/StatCard'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Select } from '../../components/ui/Select'
import { Avatar } from '../../components/ui/Avatar'
import { Progress } from '../../components/ui/Progress'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/shared/EmptyState'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { adminApi } from '../../lib/api/admin'
import { ApiError } from '../../lib/api/client'
import { useDebouncedValue } from '../../lib/useDebouncedValue'
import { formatDate } from '../../lib/format'
import type { Group } from '../../types/domain'
import { cn } from '../../lib/utils'

const createGroupSchema = z.object({
  name: z.string().min(2, 'Group name must be at least 2 characters').max(255),
  description: z.string().max(2000, 'Keep the description under 2000 characters'),
  leader: z.string().max(255, 'Keep the leader name under 255 characters'),
  color: z.enum(['brand', 'sky', 'emerald', 'amber', 'rose', 'violet']),
})

type CreateGroupValues = z.infer<typeof createGroupSchema>

const PAGE_SIZE = 9

const accentMap: Record<string, { bg: string; text: string; bar: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', bar: 'bg-brand-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
}

const colorOptions = [
  { value: 'brand', label: 'Forest green' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'sky', label: 'Sky blue' },
  { value: 'amber', label: 'Amber' },
  { value: 'rose', label: 'Rose' },
  { value: 'violet', label: 'Violet' },
]

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export function GroupsManagementPage() {
  const toast = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', description: '', leader: '', color: 'brand' },
  })

  const groupsQuery = useQuery({
    queryKey: ['admin', 'groups', debouncedSearch, page],
    queryFn: () =>
      adminApi.groups.list({
        q: debouncedSearch || undefined,
        page,
        per_page: PAGE_SIZE,
      }),
    staleTime: 20_000,
  })

  const groups: Group[] = groupsQuery.data?.items ?? []
  const stats = groupsQuery.data?.stats ?? { total: 0, members: 0, average_completion: 0 }
  const meta = groupsQuery.data?.meta
  const currentPage = meta?.current_page ?? page
  const totalPages = Math.max(1, meta?.last_page ?? 1)

  const createGroup = useMutation({
    mutationFn: (values: CreateGroupValues) =>
      adminApi.groups.create({
        name: values.name.trim(),
        description: values.description.trim() || null,
        leader: values.leader.trim() || null,
        color: values.color,
      }),
    onSuccess: (group) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'groups'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'analytics'] })
      setModalOpen(false)
      reset()
      toast.success(`${group.name} is ready. Invite members to get started.`, 'Group created')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.errors?.name) {
        setError('name', { message: error.errors.name[0] })
      }
      toast.error(errorMessage(error, 'Could not create the group.'), 'Unable to create group')
    },
  })

  const handleExport = async () => {
    setExporting(true)
    try {
      await adminApi.groups.export({ q: debouncedSearch || undefined })
      toast.success('The groups CSV has been downloaded.')
    } catch (error) {
      toast.error(errorMessage(error, 'Could not export groups.'), 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Groups management"
        description="Organise members into focused circles and monitor shared progress."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleExport} isLoading={exporting}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <UsersRound className="h-4 w-4" />
              Create group
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total groups" value={stats.total} icon={UsersRound} hint="active circles" />
        <StatCard label="Members enrolled" value={stats.members} icon={Users} accent="sky" hint="across all groups" />
        <StatCard
          label="Average completion"
          value={`${stats.average_completion}%`}
          icon={CalendarDays}
          accent="emerald"
          hint="last 30 days"
        />
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search groups, leaders or descriptions…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Search groups"
        />
      </div>

      {groupsQuery.isLoading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading groups…</div>
      ) : groupsQuery.isError ? (
        <EmptyState
          icon={UsersRound}
          title="Could not load groups"
          description={errorMessage(groupsQuery.error, 'The groups list is unavailable right now.')}
          action={<Button variant="outline" size="sm" onClick={() => void groupsQuery.refetch()}>Try again</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No groups found"
          description="Create a group or adjust your search."
          action={<Button size="sm" onClick={() => setModalOpen(true)}>Create group</Button>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const accent = accentMap[group.color ?? 'brand'] ?? accentMap.brand
              return (
                <Card key={group.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-card">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className={cn('rounded-xl p-2.5', accent.bg, accent.text)}>
                        <UsersRound className="h-5 w-5" />
                      </div>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {group.members_count} members
                      </span>
                    </div>

                    <h3 className="mt-4 text-lg font-semibold text-slate-900">{group.name}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">
                      {group.description || 'No description yet.'}
                    </p>

                    <div className="mt-4 flex items-center gap-2">
                      <Avatar name={group.leader ?? 'Unassigned'} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-700">
                          {group.leader ?? 'Unassigned'}
                        </p>
                        <p className="text-[10px] text-slate-400">Group leader</p>
                      </div>
                      <span className="ml-auto text-[10px] text-slate-400">
                        {group.created_at ? formatDate(group.created_at) : 'New'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Completion</span>
                        <span className="font-semibold text-slate-800">{group.progress}%</span>
                      </div>
                      <Progress value={group.progress} size="sm" barClassName={accent.bar} />
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{group.activities_count} activities</span>
                      <Link
                        to={`/admin/groups/${group.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
                      >
                        Open group
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>
              Showing {groups.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {(currentPage - 1) * PAGE_SIZE + groups.length} of {meta?.total ?? groups.length} groups
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage <= 1 || groupsQuery.isFetching}
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
                disabled={currentPage >= totalPages || groupsQuery.isFetching}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          reset()
        }}
        title="Create a new group"
        description="Groups help members share a goal and hold each other accountable."
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
            <Button type="submit" form="create-group-form" isLoading={createGroup.isPending}>
              <Sparkles className="h-4 w-4" />
              Create group
            </Button>
          </>
        }
      >
        <form
          id="create-group-form"
          onSubmit={handleSubmit((values) => createGroup.mutate(values))}
          className="space-y-4"
        >
          <Input label="Group name" placeholder="Morning Circle" error={errors.name?.message} {...register('name')} />
          <Textarea
            label="Description"
            placeholder="What is this group focused on?"
            error={errors.description?.message}
            {...register('description')}
          />
          <Input
            label="Group leader"
            placeholder="Maryam Idris"
            error={errors.leader?.message}
            {...register('leader')}
          />
          <Select label="Accent colour" options={colorOptions} error={errors.color?.message} {...register('color')} />
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            You can add members and assign shared activities after creating the group.
          </p>
        </form>
      </Modal>
    </div>
  )
}
