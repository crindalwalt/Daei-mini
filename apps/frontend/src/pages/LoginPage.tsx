import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layers, KeyRound, Sparkles } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

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
      await login(values)
      navigate('/')
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ThinkCode Template
          </h1>
          <p className="text-sm text-slate-500">
            Sign in with your account to access the dashboard
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              First-party Sanctum SPA cookie authentication
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive">{serverError}</Alert>
            )}

            <form id="login-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="developer@thinkcode.dev"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="flex items-center justify-end">
                <Link to="/forgot-password" className="text-sm font-semibold text-blue-600 hover:underline">
                  Forgot password?
                </Link>
              </div>

              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            </form>

            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={fillDemoCredentials}
                className="w-full text-xs text-slate-600 border border-slate-200"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Fill Demo Credentials (admin@thinkcode.dev)
              </Button>
            </div>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>Don't have an account? </span>
            <Link to="/register" className="ml-1 font-semibold text-blue-600 hover:underline">
              Create an account
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
