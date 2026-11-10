import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell,
  CheckCircle2,
  Clock3,
  Compass,
  MapPin,
  Moon,
  Save,
  Sun,
  Sunrise,
  Sunset,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { prayerTimes } from '../../lib/mockData'
import { formatTime, todayISO, formatDate } from '../../lib/format'
import { cn } from '../../lib/utils'
import type { PrayerTime } from '../../types/domain'

const preferenceSchema = z.object({
  calculation_method: z.string().min(1, 'Select a calculation method'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  timezone: z.string().min(1, 'Select a timezone'),
})

type PreferenceValues = z.infer<typeof preferenceSchema>

const icons = [Moon, Sunrise, Sun, Sun, Sunset, Moon]

const methods = [
  { value: 'muslim_world_league', label: 'Muslim World League' },
  { value: 'isna', label: 'Islamic Society of North America' },
  { value: 'egyptian', label: 'Egyptian General Authority' },
  { value: 'umm_al_qura', label: 'Umm al-Qura, Makkah' },
  { value: 'karachi', label: 'University of Islamic Sciences, Karachi' },
]

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
]

export function PrayerSchedulePage() {
  const toast = useToast()
  const [tab, setTab] = useState('today')
  const [prayers, setPrayers] = useState<PrayerTime[]>(prayerTimes)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PreferenceValues>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      calculation_method: 'muslim_world_league',
      latitude: '51.5072',
      longitude: '-0.1276',
      timezone: 'Europe/London',
    },
  })

  const completed = prayers.filter((prayer) => prayer.status === 'completed').length

  const markPrayed = (name: string) => {
    setPrayers((current) =>
      current.map((prayer) =>
        prayer.name === name ? { ...prayer, status: 'completed' } : prayer
      )
    )
    toast.success(`${name} marked as prayed.`)
  }

  const onSubmit = async (values: PreferenceValues) => {
    await new Promise((resolve) => setTimeout(resolve, 350))
    void values
    toast.success('Prayer preferences updated. Times will refresh on your next visit.', 'Saved')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Growth"
        title="Prayer & worship"
        description="Track the five daily prayers and keep your calculation preferences up to date."
        actions={
          <Badge variant="success" dot>
            {completed} of 5 prayed today
          </Badge>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: 'today', label: "Today's prayers" },
          { id: 'preferences', label: 'Preferences' },
        ]}
      />

      {tab === 'today' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Prayer times</CardTitle>
                <p className="mt-1 text-sm text-slate-500">{formatDate(todayISO())}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
                <MapPin className="h-3.5 w-3.5" />
                London, UK
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              {prayers.map((prayer, index) => {
                const Icon = icons[index] ?? Moon
                const isCurrent = prayer.status === 'current'
                const isCompleted = prayer.status === 'completed'
                return (
                  <div
                    key={prayer.name}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border p-3.5 transition-colors',
                      isCurrent
                        ? 'border-brand-200 bg-brand-50/60'
                        : isCompleted
                          ? 'border-emerald-100 bg-emerald-50/40'
                          : 'border-slate-100'
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-xl p-2.5',
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-600'
                          : isCurrent
                            ? 'bg-brand-100 text-brand-700'
                            : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{prayer.name}</p>
                        <span className="text-xs text-slate-400" dir="rtl">
                          {prayer.arabic}
                        </span>
                        {isCurrent && (
                          <Badge variant="info" dot>
                            Now
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="success">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Prayed
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock3 className="h-3 w-3" />
                        {formatTime(prayer.time)}
                      </p>
                    </div>
                    {!isCompleted && (
                      <Button variant="outline" size="sm" onClick={() => markPrayed(prayer.name)}>
                        Mark prayed
                      </Button>
                    )}
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-100">
                  <Compass className="h-4 w-4" />
                  Qibla direction
                </div>
                <p className="mt-3 text-3xl font-bold">119°</p>
                <p className="text-sm text-brand-100">Southeast from your location</p>
              </div>
              <CardContent className="space-y-2 p-4 text-sm text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Location</span>
                  <span className="font-medium text-slate-700">London, UK</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Method</span>
                  <span className="font-medium text-slate-700">Muslim World League</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Timezone</span>
                  <span className="font-medium text-slate-700">Europe/London</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prayers.slice(0, 5).map((prayer) => (
                  <label key={prayer.name} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{prayer.name} reminder</span>
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                    />
                  </label>
                ))}
                <p className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400">
                  <Bell className="h-3 w-3" />
                  Reminders are sent 10 minutes before the adhan.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Calculation preferences</CardTitle>
              <p className="text-sm text-slate-500">
                These settings control how prayer times are calculated for your location.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Select
                  label="Calculation method"
                  options={methods}
                  error={errors.calculation_method?.message}
                  {...register('calculation_method')}
                />
                <Select
                  label="Timezone"
                  options={timezones}
                  error={errors.timezone?.message}
                  {...register('timezone')}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Latitude" placeholder="51.5072" error={errors.latitude?.message} {...register('latitude')} />
                  <Input label="Longitude" placeholder="-0.1276" error={errors.longitude?.message} {...register('longitude')} />
                </div>
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Leave latitude and longitude blank to use automatic location detection on supported
                  devices.
                </p>
                <div className="flex justify-end">
                  <Button type="submit" isLoading={isSubmitting}>
                    <Save className="h-4 w-4" />
                    Save preferences
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Calculation methods differ in the sun angles used for Fajr and Isha. Choose the one
                used by your local mosque for the closest match.
              </p>
              <p>
                If your mosque publishes its own timetable, follow that instead — the app is a
                guide, not a replacement for local authority.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
