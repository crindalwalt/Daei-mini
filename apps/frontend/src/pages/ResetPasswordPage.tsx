import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

const resetPasswordSchema = z
  .object({
    token: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
    email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, email, password: '', password_confirmation: '' },
  })

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setServerError(null)
    try {
      await resetPassword({
        token: values.token,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      setSuccess(true)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, messages]) => {
            setError(field as keyof ResetPasswordFormValues, {
              type: 'server',
              message: messages[0],
            })
          })
        } else {
          setServerError(err.message)
        }
      } else {
        setServerError('An unexpected error occurred while resetting your password.')
      }
    }
  }

  if (success) {
    return (
      <AuthLayout
        title="Password reset"
        subtitle="Your new password is ready to use."
        badge="All done"
        footer={
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Continue to sign in
          </Link>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Password updated successfully</p>
            <p className="mt-1 text-sm text-slate-500">
              You can now sign in with your new password.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate('/login')}>
            <KeyRound className="h-4 w-4" />
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Enter the six-digit code from your email and set a new password."
      badge="Account recovery"
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Sign in instead
          </Link>
        </>
      }
    >
      {serverError && (
        <div className="mb-4">
          <Alert variant="destructive">{serverError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="One-time code (OTP)"
          type="text"
          inputMode="numeric"
          maxLength={6}
          placeholder="6-digit code from your email"
          autoComplete="one-time-code"
          error={errors.token?.message}
          {...register('token')}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          rightSlot={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          {...register('password')}
        />

        <Input
          label="Confirm new password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Re-enter new password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
          <KeyRound className="h-4 w-4" />
          Reset Password
        </Button>
      </form>
    </AuthLayout>
  )
}
