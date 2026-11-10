import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { EmptyState } from '../../components/shared/EmptyState'
import { journalEntries } from '../../lib/mockData'
import { formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'

const moods = [
  { label: 'Grateful', className: 'bg-emerald-100 text-emerald-700' },
  { label: 'Reflective', className: 'bg-sky-100 text-sky-700' },
  { label: 'Calm', className: 'bg-brand-100 text-brand-700' },
  { label: 'Tired', className: 'bg-amber-100 text-amber-700' },
  { label: 'Energised', className: 'bg-violet-100 text-violet-700' },
]

export function JournalListPage() {
  const [search, setSearch] = useState('')
  const [mood, setMood] = useState('all')

  const filtered = useMemo(
    () =>
      journalEntries.filter((entry) => {
        const matchesSearch =
          !search ||
          entry.title.toLowerCase().includes(search.toLowerCase()) ||
          entry.content.toLowerCase().includes(search.toLowerCase())
        const matchesMood = mood === 'all' || entry.mood === mood
        return matchesSearch && matchesMood
      }),
    [search, mood]
  )

  const moodNames = useMemo(
    () => ['all', ...Array.from(new Set(journalEntries.map((entry) => entry.mood)))],
    []
  )

  const streak = 4

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Journal"
        description="Reflect on your days, capture lessons and watch your thinking evolve."
        actions={
          <Link to="/app/journal/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New entry
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Entries
              </p>
              <p className="text-xl font-bold text-slate-900">{journalEntries.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Current streak
              </p>
              <p className="text-xl font-bold text-slate-900">{streak} days</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <span className="rounded-xl bg-sky-50 p-2.5 text-sky-600">
              <CalendarDays className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Last entry
              </p>
              <p className="text-xl font-bold text-slate-900">
                {journalEntries[0] ? formatDate(journalEntries[0].entry_date) : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your journal…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            aria-label="Search journal entries"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {moodNames.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setMood(option)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                mood === option
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-200'
              )}
            >
              {option === 'all' ? 'All moods' : option}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No journal entries found"
          description="Try a different search or write your first entry."
          action={
            <Link to="/app/journal/new">
              <Button size="sm">
                <Plus className="h-4 w-4" />
                Write an entry
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((entry) => {
            const moodStyle =
              moods.find((item) => item.label === entry.mood)?.className ??
              'bg-slate-100 text-slate-600'
            return (
              <Card key={entry.id} className="group transition-all hover:-translate-y-0.5 hover:shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold text-slate-900">{entry.title}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatDate(entry.entry_date, {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                      </p>
                    </div>
                    <Badge className={moodStyle}>{entry.mood}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                    {entry.content}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {entry.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
                      >
                        #{tag}
                      </span>
                    ))}
                    <Link
                      to={`/app/journal/${entry.id}`}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                    >
                      <Pencil className="h-3 w-3" />
                      Read & edit
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
