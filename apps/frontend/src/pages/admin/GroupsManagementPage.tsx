import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  CalendarDays,
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
import { Avatar } from '../../components/ui/Avatar'
import { Progress } from '../../components/ui/Progress'
import { Modal } from '../../components/ui/Modal'
import { EmptyState } from '../../components/shared/EmptyState'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { groups as seedGroups } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import type { Group } from '../../types/domain'
import { cn } from '../../lib/utils'

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters'),
  description: z.string().min(12, 'Add a short description (at least 12 characters)'),
  leader: z.string().min(2, 'Assign a group leader'),
})

type CreateGroupValues = z.infer<typeof createGroupSchema>

const accentMap: Record<string, { bg: string; text: string; bar: string }> = {
  brand: { bg: 'bg-brand-50', text: 'text-brand-700', bar: 'bg-brand-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', bar: 'bg-sky-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', bar: 'bg-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', bar: 'bg-amber-500' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', bar: 'bg-rose-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', bar: 'bg-violet-500' },
}

export function GroupsManagementPage() {
  const toast = useToast()
  const [groupList, setGroupList] = useState<Group[]>(seedGroups)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', description: '', leader: '' },
  })

  const filtered = useMemo(
    () =>
      groupList.filter(
        (group) =>
          !search ||
          group.name.toLowerCase().includes(search.toLowerCase()) ||
          (group.description ?? '').toLowerCase().includes(search.toLowerCase())
      ),
    [groupList, search]
  )

  const totals = useMemo(() => {
    const members = groupList.reduce((sum, group) => sum + group.members_count, 0)
    const progress =
      groupList.length === 0
        ? 0
        : Math.round(groupList.reduce((sum, group) => sum + group.progress, 0) / groupList.length)
    return { members, progress }
  }, [groupList])

  const onSubmit = async (values: CreateGroupValues) => {
    const palette = ['brand', 'sky', 'emerald', 'amber', 'rose', 'violet']
    const newGroup: Group = {
      id: Date.now(),
      name: values.name,
      description: values.description,
      leader: values.leader,
      members_count: 0,
      activities_count: 0,
      progress: 0,
      color: palette[groupList.length % palette.length],
      created_at: new Date().toISOString().slice(0, 10),
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
    setGroupList((current) => [...current, newGroup])
    setModalOpen(false)
    reset()
    toast.success(`${values.name} is ready. Invite members to get started.`, 'Group created')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage"
        title="Groups management"
        description="Organise members into focused circles and monitor shared progress."
        actions={
          <Button size="sm" onClick={() => setModalOpen(true)}>
            <UsersRound className="h-4 w-4" />
            Create group
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total groups" value={groupList.length} icon={UsersRound} hint="active circles" />
        <StatCard label="Members enrolled" value={totals.members} icon={Users} accent="sky" hint="across all groups" />
        <StatCard label="Average completion" value={`${totals.progress}%`} icon={CalendarDays} accent="emerald" hint="last 30 days" />
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search groups…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          aria-label="Search groups"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No groups found"
          description="Create a group or adjust your search."
          action={<Button size="sm" onClick={() => setModalOpen(true)}>Create group</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => {
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
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-500">{group.description}</p>

                  <div className="mt-4 flex items-center gap-2">
                    <Avatar name={group.leader ?? 'Unassigned'} size="xs" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-700">{group.leader ?? 'Unassigned'}</p>
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
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create a new group"
        description="Groups help members share a goal and hold each other accountable."
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-group-form" isLoading={isSubmitting}>
              <Sparkles className="h-4 w-4" />
              Create group
            </Button>
          </>
        }
      >
        <form id="create-group-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Group name" placeholder="Morning Circle" error={errors.name?.message} {...register('name')} />
          <Textarea
            label="Description"
            placeholder="What is this group focused on?"
            error={errors.description?.message}
            {...register('description')}
          />
          <Input label="Group leader" placeholder="Maryam Idris" error={errors.leader?.message} {...register('leader')} />
          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            You can add members and assign shared activities after creating the group.
          </p>
        </form>
      </Modal>
    </div>
  )
}
