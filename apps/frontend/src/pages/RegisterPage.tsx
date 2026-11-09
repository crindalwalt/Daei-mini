import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Layers, UserPlus } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      await registerUser(values)
      navigate('/')
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          Object.entries(err.errors).forEach(([field, messages]) => {
            setError(field as keyof RegisterFormValues, {
              type: 'server',
              message: messages[0],
            })
          })
        } else {
          setServerError(err.message)
        }
      } else {
        setServerError('An unexpected error occurred during registration.')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-blue-600 text-white items-center justify-center shadow-md">
            <Layers className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Account
          </h1>
          <p className="text-sm text-slate-500">
            Join the ThinkCode developer workspace
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Enter your details to create a new user profile. We'll email you a verification link.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {serverError && (
              <Alert variant="destructive">{serverError}</Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Ada Lovelace"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
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
                label="Password"
                type="password"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter password"
                autoComplete="new-password"
                error={errors.password_confirmation?.message}
                {...register('password_confirmation')}
              />

              <Button
                type="submit"
                className="w-full"
                isLoading={isSubmitting}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Register
              </Button>
            </form>
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>Already have an account? </span>
            <Link to="/login" className="ml-1 font-semibold text-blue-600 hover:underline">
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
