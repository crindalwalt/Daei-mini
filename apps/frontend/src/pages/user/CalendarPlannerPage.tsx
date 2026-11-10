import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Plus,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { ActivityTypeBadge } from '../../components/shared/StatusBadge'
import { calendarEvents } from '../../lib/mockData'
import { formatDate, formatTime, todayISO } from '../../lib/format'
import { cn } from '../../lib/utils'

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function buildMonthGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = (firstOfMonth.getDay() + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: { date: string | null; day: number | null }[] = []

  for (let i = 0; i < startOffset; i += 1) cells.push({ date: null, day: null })
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day)
    cells.push({ date: toISO(date), day })
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null })
  return cells
}

function toISO(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function CalendarPlannerPage() {
  const today = new Date()
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDate, setSelectedDate] = useState(todayISO())

  const cells = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor])

  const eventsByDate = useMemo(() => {
    const map = new Map<string, typeof calendarEvents>()
    calendarEvents.forEach((event) => {
      const existing = map.get(event.date) ?? []
      map.set(event.date, [...existing, event])
    })
    return map
  }, [])

  const selectedEvents = eventsByDate.get(selectedDate) ?? []
  const monthEvents = calendarEvents.filter((event) => {
    const [year, month] = event.date.split('-').map(Number)
    return year === cursor.year && month === cursor.month + 1
  })

  const changeMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Today"
        title="Calendar & planner"
        description="See your activities across the month and plan the week ahead."
        actions={
          <Link to="/app/activities/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              Add activity
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-brand-600" />
              <CardTitle>
                {monthNames[cursor.month]} {cursor.year}
              </CardTitle>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCursor({ year: today.getFullYear(), month: today.getMonth() })
                  setSelectedDate(todayISO())
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                >
                  {day}
                </div>
              ))}
              {cells.map((cell, index) => {
                if (!cell.date) {
                  return <div key={`empty-${index}`} className="min-h-16 rounded-lg bg-slate-50/40" />
                }
                const events = eventsByDate.get(cell.date) ?? []
                const isToday = cell.date === todayISO()
                const isSelected = cell.date === selectedDate
                return (
                  <button
                    key={cell.date}
                    type="button"
                    onClick={() => setSelectedDate(cell.date!)}
                    className={cn(
                      'min-h-16 rounded-lg border p-1.5 text-left transition-colors sm:min-h-20',
                      isSelected
                        ? 'border-brand-400 bg-brand-50'
                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                        isToday
                          ? 'bg-brand-600 text-white'
                          : isSelected
                            ? 'text-brand-700'
                            : 'text-slate-600'
                      )}
                    >
                      {cell.day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {events.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className="block truncate rounded bg-white px-1 py-0.5 text-[9px] font-medium text-slate-600 shadow-sm"
                        >
                          {event.title}
                        </span>
                      ))}
                      {events.length > 2 && (
                        <span className="block text-[9px] font-semibold text-brand-600">
                          +{events.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long' })}
              </CardTitle>
              <p className="text-sm text-slate-500">{selectedEvents.length} scheduled items</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {selectedEvents.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                  Nothing scheduled. A good day for rest or a new goal.
                </p>
              ) : (
                selectedEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">{event.title}</p>
                      <Badge
                        variant={
                          event.status === 'completed'
                            ? 'success'
                            : event.status === 'missed'
                              ? 'destructive'
                              : 'info'
                        }
                      >
                        {event.status}
                      </Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <ActivityTypeBadge type={event.type} />
                      {event.time && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <Clock3 className="h-3 w-3" />
                          {formatTime(event.time)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              <Link to="/app/activities/new" className="block pt-1">
                <Button variant="soft" size="sm" className="w-full">
                  <Plus className="h-3.5 w-3.5" />
                  Schedule something
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">This month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Scheduled</span>
                <span className="font-semibold text-slate-800">{monthEvents.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Completed</span>
                <span className="font-semibold text-emerald-600">
                  {monthEvents.filter((event) => event.status === 'completed').length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pending</span>
                <span className="font-semibold text-sky-600">
                  {monthEvents.filter((event) => event.status === 'pending').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
