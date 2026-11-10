import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginPageProps {
  adminMode?: boolean
}

export function LoginPage({ adminMode = false }: LoginPageProps) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const verificationStatus = searchParams.get('verified')
  const [serverError, setServerError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      const response = await login(values)
      navigate(response.user.role === 'admin' ? '/admin' : '/app')
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError('An unexpected error occurred during login.')
      }
    }
  }

  const fillDemoCredentials = () => {
    setValue('email', 'admin@thinkcode.dev', { shouldValidate: true })
    setValue('password', 'password', { shouldValidate: true })
    setServerError(null)
  }

  return (
    <AuthLayout
      title={adminMode ? 'Sign in to the admin panel' : 'Welcome back'}
      subtitle={
        adminMode
          ? 'Access user management, group progress and daily reports.'
          : 'Sign in to continue your daily plan, habits and reflections.'
      }
      badge={adminMode ? 'Administrator access' : 'Member access'}
      adminMode={adminMode}
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        {verificationStatus === '1' && (
          <Alert variant="success">Your email address has been verified. You can sign in now.</Alert>
        )}

        {verificationStatus === '0' && (
          <Alert variant="destructive">
            This verification link is invalid or has expired. Please request a new one.
          </Alert>
        )}

        {serverError && <Alert variant="destructive">{serverError}</Alert>}

        <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            labelAction={
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Forgot password?
              </Link>
            }
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label={showPassword ? 'Hide characters' : 'Show characters'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            {...register('password')}
          />

          <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <input
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            Keep me signed in on this device
          </label>

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            <KeyRound className="h-4 w-4" />
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-100" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-white px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Demo access
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fillDemoCredentials}
          className="w-full border-slate-200 text-xs text-slate-600"
        >
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          Fill Demo Credentials (admin@thinkcode.dev)
        </Button>

        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
          <span>{adminMode ? 'Admin portal' : 'Member portal'}</span>
          <Link
            to={adminMode ? '/login' : '/admin/login'}
            className="font-semibold text-slate-500 hover:text-brand-700 hover:underline"
          >
            {adminMode ? 'Go to member login' : 'Go to admin login'}
          </Link>
        </div>
      </div>
    </AuthLayout>
  )
}
