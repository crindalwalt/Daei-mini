import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'
import { AuthLayout } from '../components/layout/AuthLayout'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().min(1, 'Email is required').email('Must be a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Password confirmation is required'),
    accept_terms: z.boolean().refine((value) => value, {
      message: 'Please accept the community guidelines',
    }),
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
  const [showPassword, setShowPassword] = useState(false)

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
      accept_terms: false,
    },
  })

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null)
    try {
      const response = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      })
      navigate(response.user.role === 'admin' ? '/admin' : '/app')
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
        setServerError('An unexpected error occurred while creating your account.')
      }
    }
  }

  return (
    <AuthLayout
      title="Create Your Account"
      subtitle="Start with a simple daily plan and build consistent habits."
      badge="Get Started"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#106030] hover:underline">
            Sign in
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
          label="Full name"
          type="text"
          placeholder="Hamza Khan"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
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
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          helperText="Use 8 or more characters with a mix of letters and numbers."
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
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          placeholder="Re-enter your password"
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-500 cursor-pointer">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-[#E0E0D0] text-[#106030] focus:ring-[#106030]"
            {...register('accept_terms')}
          />
          <span>
            I agree to the community guidelines and commit to respectful, consistent daily growth.
          </span>
        </label>
        {errors.accept_terms && (
          <p className="text-xs font-medium text-red-600">{errors.accept_terms.message}</p>
        )}

        <Button
          type="submit"
          className="w-full bg-[#106030] hover:bg-[#145C3A] text-white rounded-xl shadow-xs"
          size="lg"
          isLoading={isSubmitting}
        >
          <UserPlus className="h-4 w-4" />
          Create Account
        </Button>
      </form>
    </AuthLayout>
  )
}
