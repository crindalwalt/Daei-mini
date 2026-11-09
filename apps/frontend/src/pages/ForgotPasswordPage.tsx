import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layers, MailCheck } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'

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
    defaultValues: {
      email: '',
    },
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Forgot Password
          </h1>
          <p className="text-sm text-slate-500">
            Enter your email address and we'll send you a one-time code
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Send a one-time code</CardTitle>
            <CardDescription>
              We'll email you a 6-digit code to reset your password
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive">{serverError}</Alert>
            )}

            {isSent ? (
              <div className="space-y-4 text-sm text-slate-600">
                <Alert variant="success">
                  If an account exists for <span className="font-semibold">{submittedEmail}</span>,
                  a one-time code has been sent to your email.
                </Alert>

                {resetToken && import.meta.env.MODE !== 'production' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="font-semibold text-slate-900">Development OTP code</p>
                    <p className="text-xs text-slate-500">
                      In production the code is delivered by email. In development you can use the code below:
                    </p>
                    <code className="block rounded bg-slate-900 px-3 py-2 text-center text-lg font-semibold tracking-[0.35em] text-slate-100">
                      {resetToken}
                    </code>
                  </div>
                )}

                <Link
                  to={resetPath}
                  className="inline-block font-semibold text-blue-600 hover:underline"
                >
                  Enter the one-time code
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="developer@thinkcode.dev"
                  autoComplete="email"
                  error={errors.email?.message}
                  {...register('email')}
                />

                <Button
                  type="submit"
                  className="w-full"
                  isLoading={isSubmitting}
                >
                  <MailCheck className="w-4 h-4 mr-2" />
                  Send OTP Code
                </Button>
              </form>
            )}
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
