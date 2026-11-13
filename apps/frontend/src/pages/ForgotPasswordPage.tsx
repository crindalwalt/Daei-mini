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
    setSubmittedEmail(null)

    try {
      await forgotPassword({ email: values.email })
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
  const resetPath = `/reset-password?email=${encodeURIComponent(submittedEmail ?? '')}`

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="We will email you a six-digit code so you can choose a new password."
      badge="Account recovery"
      footer={
        <>
          Remembered your password?{' '}
          <Link to="/login" className="font-semibold text-[#106030] hover:underline">
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
        <div className="space-y-4 text-sm text-[#77817B]">
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E7F1E4] text-[#106030]">
              <MailCheck className="h-7 w-7" />
            </div>
            <p className="font-serif text-lg font-bold text-[#145C3A]">Check your inbox</p>
            <p className="mt-1 text-sm text-[#77817B]">
              If an account exists for <span className="font-semibold text-[#1F2E28]">{submittedEmail}</span>, a
              one-time code has been sent.
            </p>
          </div>

          <Alert variant="success">
            The code expires in 15 minutes. Check your spam folder if it does not arrive.
          </Alert>

          <Link to={resetPath} className="block">
            <Button className="w-full bg-[#106030] hover:bg-[#145C3A] text-white rounded-xl shadow-xs" size="lg">
              <MailCheck className="h-4 w-4" />
              Enter the one-time code
            </Button>
          </Link>

          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setSubmittedEmail(null)
            }}
            className="w-full text-center text-xs font-semibold text-[#77817B] hover:text-[#106030] transition-colors cursor-pointer"
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

          <Button
            type="submit"
            className="w-full bg-[#106030] hover:bg-[#145C3A] text-white rounded-xl shadow-xs"
            size="lg"
            isLoading={isSubmitting}
          >
            <MailCheck className="h-4 w-4" />
            Send one-time code
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[#77817B] hover:text-[#106030] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  )
}
