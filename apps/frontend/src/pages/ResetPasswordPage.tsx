import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layers, KeyRound } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'

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

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token,
      email,
      password: '',
      password_confirmation: '',
    },
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
      navigate('/login')
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center shadow-md">
              <Layers className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Password Reset
            </h1>
            <p className="text-sm text-slate-500">
              Your password has been reset successfully
            </p>
          </div>

          <Card>
            <CardContent className="space-y-4 text-center">
              <Alert variant="success">
                Your password has been reset successfully. You can now sign in with your new password.
              </Alert>
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500">
            Enter the one-time code we emailed you and choose a new password
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set a new password</CardTitle>
            <CardDescription>
              Enter the 6-digit code from your email, then choose a new password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive">{serverError}</Alert>
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
                placeholder="developer@thinkcode.dev"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <Input
                label="New password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm new password"
                type="password"
                placeholder="Re-enter new password"
                autoComplete="new-password"
                error={errors.password_confirmation?.message}
                {...register('password_confirmation')}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Reset Password
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>Remembered your password? </span>
            <Link to="/login" className="ml-1 font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
