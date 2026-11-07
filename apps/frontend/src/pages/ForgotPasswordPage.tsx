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
        setServerError('An unexpected error occurred while requesting the reset link.')
      }
    }
  }

  const isSent = submitted && !serverError && submittedEmail !== null

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
            Enter your email address and we'll send you a reset link
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>
              We'll email you a secure link to reset your password
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
                  a password reset link has been sent to your email.
                </Alert>

                {resetToken && import.meta.env.MODE !== 'production' && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                    <p className="font-semibold text-slate-900">Development reset token</p>
                    <p className="text-xs text-slate-500">
                      In production the reset link is delivered by email. In development you can use the token below:
                    </p>
                    <code className="block rounded bg-slate-900 px-3 py-2 text-xs text-slate-100 break-all">
                      {resetToken}
                    </code>
                    <Link
                      to={`/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(submittedEmail ?? '')}`}
                      className="inline-block font-semibold text-blue-600 hover:underline"
                    >
                      Continue to password reset
                    </Link>
                  </div>
                )}
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
                  Send Reset Link
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
