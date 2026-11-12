import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import type { ApiEnvelope } from '../../types/api'
import type {
  AuthPayload,
  AuthResponse,
  ForgotPasswordData,
  ForgotPasswordResponse,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  User,
} from '../../types/auth'
import { AuthContext } from './authContextDef'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  // Retrieve authenticated user
  const { data, isLoading } = useQuery<ApiEnvelope<{ user: User }>>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<ApiEnvelope<{ user: User }>>('/api/v1/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const user = data?.data?.user ?? null

  // Listen for unauthenticated API responses
  React.useEffect(() => {
    apiClient.onUnauthorized(() => {
      queryClient.setQueryData(['auth', 'me'], null)
    })
  }, [queryClient])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<ApiEnvelope<AuthPayload>>('/api/v1/auth/login', credentials),
    onSuccess: (response) => {
      apiClient.setToken(response.data?.token ?? null)
      if (response.data?.user) {
        queryClient.setQueryData(['auth', 'me'], {
          success: true,
          data: { user: response.data.user },
          message: response.message,
        })
      }
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (regData: RegisterData) =>
      apiClient.post<ApiEnvelope<AuthPayload>>('/api/v1/auth/register', regData),
    onSuccess: (response) => {
      if (response.data?.token) apiClient.setToken(response.data.token)
      if (response.data?.user) {
        queryClient.setQueryData(['auth', 'me'], {
          success: true,
          data: { user: response.data.user },
          message: response.message,
        })
      }
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout'),
    onSettled: () => {
      apiClient.setToken(null)
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
    },
  })

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordData) =>
      apiClient.post<ApiEnvelope<null>>('/api/v1/auth/forgot-password', payload),
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (payload: ResetPasswordData) =>
      apiClient.post<ApiEnvelope<null>>('/api/v1/auth/reset-password', payload),
  })

  // Resend email verification mutation
  const resendVerificationMutation = useMutation({
    mutationFn: () =>
      apiClient.post<ApiEnvelope<null>>('/api/v1/auth/email/verification-notification'),
  })

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await loginMutation.mutateAsync(credentials)
    return {
      user: response.data.user,
      message: response.message,
      token: response.data.token,
      token_type: response.data.token_type,
      abilities: response.data.abilities,
    }
  }

  const register = async (regData: RegisterData): Promise<AuthResponse> => {
    const response = await registerMutation.mutateAsync(regData)
    return {
      user: response.data.user,
      message: response.message,
      token: response.data.token,
      token_type: response.data.token_type,
      abilities: response.data.abilities,
    }
  }

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync()
  }

  const forgotPassword = async (
    payload: ForgotPasswordData
  ): Promise<ForgotPasswordResponse> => {
    const response = await forgotPasswordMutation.mutateAsync(payload)
    return {
      message: response.message,
    }
  }

  const resetPassword = async (payload: ResetPasswordData): Promise<{ message: string }> => {
    const response = await resetPasswordMutation.mutateAsync(payload)
    return { message: response.message }
  }

  const resendVerificationEmail = async (): Promise<void> => {
    await resendVerificationMutation.mutateAsync()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        forgotPassword,
        resetPassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
