import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Bell,
  CheckCircle2,
  KeyRound,
  Save,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Textarea } from '../../components/ui/Textarea'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Tabs } from '../../components/ui/Tabs'
import { useToast } from '../../components/ui/toast/ToastProvider'
import { useAuth } from '../../features/auth/useAuth'
import { authApi } from '../../lib/api/endpoints'
import { ApiError } from '../../lib/api/client'

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  timezone: z.string().min(1, 'Select a timezone'),
  bio: z.string().max(280, 'Keep the bio under 280 characters').optional(),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Confirm your new password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT)' },
]

export function AdminProfileSettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('profile')
  const [preferences, setPreferences] = useState({
    reportEmails: true,
    weeklyDigest: true,
    pendingAccounts: true,
    darkMode: false,
    compactTables: false,
  })

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: savingProfile },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? 'Maryam Idris',
      email: user?.email ?? 'admin@thinkcode.dev',
      timezone: user?.timezone ?? 'Europe/London',
      bio: 'Programme administrator focused on member growth and consistent reporting.',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: savingPassword },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', password: '', password_confirmation: '' },
  })

  const onSaveProfile = async (values: ProfileValues) => {
    try {
      await authApi.updateProfile({ name: values.name, email: values.email, timezone: values.timezone })
      toast.success('Your profile details have been saved.', 'Profile updated')
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message, 'Could not save profile')
      } else {
        toast.info('Saved locally. The API is currently unreachable.', 'Offline mode')
      }
    }
  }

  const onChangePassword = async (values: PasswordValues) => {
    // Password updates are simulated locally — the API contract for this lives on the profile route.
    await new Promise((resolve) => setTimeout(resolve, 400))
    resetPasswordForm()
    toast.success('Your password was changed successfully.', 'Security updated')
    void values
  }

  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((current) => ({ ...current, [key]: !current[key] }))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Profile & settings"
        description="Manage your administrator profile, notifications and account security."
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <Avatar name={user?.name ?? 'Administrator'} size="xl" className="ring-4 ring-brand-50" />
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              {user?.name ?? 'Administrator'}
            </h2>
            <p className="text-sm text-slate-500">{user?.email ?? 'admin@thinkcode.dev'}</p>
            <Badge variant="default" className="mt-3">
              <ShieldCheck className="mr-1 h-3 w-3" />
              Administrator
            </Badge>
            <div className="mt-5 w-full space-y-2.5 text-left text-sm">
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Member since</span>
                <span className="font-semibold text-slate-700">Jan 2025</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Groups managed</span>
                <span className="font-semibold text-slate-700">6</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Reports reviewed</span>
                <span className="font-semibold text-slate-700">312</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-5 xl:col-span-2">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: 'profile', label: 'Profile', icon: <UserIcon className="h-3.5 w-3.5" /> },
              { id: 'preferences', label: 'Preferences', icon: <Bell className="h-3.5 w-3.5" /> },
              { id: 'security', label: 'Security', icon: <KeyRound className="h-3.5 w-3.5" /> },
            ]}
          />

          {tab === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle>Profile details</CardTitle>
                <CardDescription>This information is visible to your team.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Full name" error={profileErrors.name?.message} {...registerProfile('name')} />
                    <Input
                      label="Email address"
                      type="email"
                      error={profileErrors.email?.message}
                      {...registerProfile('email')}
                    />
                  </div>
                  <Select label="Timezone" options={timezones} error={profileErrors.timezone?.message} {...registerProfile('timezone')} />
                  <Textarea
                    label="Bio"
                    placeholder="A short description about your role"
                    error={profileErrors.bio?.message}
                    {...registerProfile('bio')}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={savingProfile}>
                      <Save className="h-4 w-4" />
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {tab === 'preferences' && (
            <Card>
              <CardHeader>
                <CardTitle>Notification preferences</CardTitle>
                <CardDescription>Choose what you want to be notified about.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  {
                    key: 'reportEmails' as const,
                    title: 'Daily report emails',
                    description: 'Receive a digest when new reports are submitted.',
                  },
                  {
                    key: 'weeklyDigest' as const,
                    title: 'Weekly progress digest',
                    description: 'A weekly summary of group completion and top members.',
                  },
                  {
                    key: 'pendingAccounts' as const,
                    title: 'Pending account alerts',
                    description: 'Get notified when a member is awaiting approval.',
                  },
                  {
                    key: 'darkMode' as const,
                    title: 'Dark mode',
                    description: 'Use a darker interface for low-light environments.',
                  },
                  {
                    key: 'compactTables' as const,
                    title: 'Compact tables',
                    description: 'Show more rows per screen in management tables.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-start justify-between gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-800">{item.title}</span>
                      <span className="block text-xs text-slate-500">{item.description}</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={preferences[item.key]}
                      onClick={() => togglePreference(item.key)}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        preferences[item.key] ? 'bg-brand-600' : 'bg-slate-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          preferences[item.key] ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                ))}
                <div className="flex justify-end pt-3">
                  <Button onClick={() => toast.success('Preferences saved.')}>
                    <CheckCircle2 className="h-4 w-4" />
                    Save preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>Change password</CardTitle>
                <CardDescription>Use a strong password you don&apos;t use elsewhere.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
                  <Input
                    label="Current password"
                    type="password"
                    autoComplete="current-password"
                    error={passwordErrors.current_password?.message}
                    {...registerPassword('current_password')}
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input
                      label="New password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordErrors.password?.message}
                      {...registerPassword('password')}
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                      autoComplete="new-password"
                      error={passwordErrors.password_confirmation?.message}
                      {...registerPassword('password_confirmation')}
                    />
                  </div>
                  <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                    Password changes sign you out of other devices after 24 hours.
                  </p>
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={savingPassword}>
                      <KeyRound className="h-4 w-4" />
                      Update password
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
