import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, MailCheck } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordPage() {
  const { forgotPassword } = useAuth()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setServerError(null)
    setSubmitted(false)
    setResetToken(null)
    setSubmittedEmail(null)

    try {
      const response = await forgotPassword({ email: values.email })
      setResetToken(response?.reset_token ?? null)
      setSubmittedEmail(values.email)
      setSubmitted(true)
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError('An unexpected error occurred while requesting the one-time code.')
      }
    }
  }

  const isSent = submitted && !serverError && submittedEmail !== null
  const resetPath = `/reset-password?email=${encodeURIComponent(submittedEmail ?? '')}${
    resetToken ? `&token=${encodeURIComponent(resetToken)}` : ''
  }`

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We will email you a six-digit code so you can choose a new password."
      badge="Account recovery"
      footer={
        <>
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {serverError && (
        <div className="mb-4">
          <Alert variant="destructive">{serverError}</Alert>
        </div>
      )}

      {isSent ? (
        <div className="space-y-4 text-sm text-slate-600">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <MailCheck className="h-6 w-6" />
            </div>
            <p className="font-semibold text-slate-900">Check your inbox</p>
            <p className="mt-1 text-slate-500">
              If an account exists for <span className="font-semibold">{submittedEmail}</span>, a
              one-time code has been sent.
            </p>
          </div>

          <Alert variant="success">
            The code expires in 15 minutes. Check your spam folder if it does not arrive.
          </Alert>

          {resetToken && import.meta.env.MODE !== 'production' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Development OTP code
              </p>
              <code className="mt-2 block rounded-lg bg-slate-900 px-3 py-2.5 text-center text-lg font-semibold tracking-[0.35em] text-slate-100">
                {resetToken}
              </code>
            </div>
          )}

          <Link to={resetPath}>
            <Button className="w-full">
              <MailCheck className="h-4 w-4" />
              Enter the one-time code
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setSubmittedEmail(null)
              setResetToken(null)
            }}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-brand-700"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
            <MailCheck className="h-4 w-4" />
            Send one-time code
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
