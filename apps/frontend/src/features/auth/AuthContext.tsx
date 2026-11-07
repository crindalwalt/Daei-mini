import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import type { AuthResponse, ForgotPasswordData, ForgotPasswordResponse, LoginCredentials, RegisterData, ResetPasswordData, User } from '../../types/auth'
import { AuthContext } from './authContextDef'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()

  // Retrieve authenticated user
  const { data, isLoading } = useQuery<{ user: User }>({
    queryKey: ['auth', 'me'],
    queryFn: () => apiClient.get<{ user: User }>('/api/v1/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const user = data?.user || null

  // Listen for unauthenticated API responses
  React.useEffect(() => {
    apiClient.onUnauthorized(() => {
      queryClient.setQueryData(['auth', 'me'], null)
    })
  }, [queryClient])

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<AuthResponse>('/api/v1/auth/login', credentials),
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], { user: response.user })
    },
  })

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: (regData: RegisterData) =>
      apiClient.post<AuthResponse>('/api/v1/auth/register', regData),
    onSuccess: (response) => {
      queryClient.setQueryData(['auth', 'me'], { user: response.user })
    },
  })

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/api/v1/auth/logout'),
    onSettled: () => {
      queryClient.setQueryData(['auth', 'me'], null)
      queryClient.clear()
    },
  })

  // Forgot password mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: (data: ForgotPasswordData) =>
      apiClient.post<ForgotPasswordResponse>('/api/v1/auth/forgot-password', data),
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (data: ResetPasswordData) =>
      apiClient.post<{ message: string }>('/api/v1/auth/reset-password', data),
  })

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return loginMutation.mutateAsync(credentials)
  }

  const register = async (regData: RegisterData): Promise<AuthResponse> => {
    return registerMutation.mutateAsync(regData)
  }

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync()
  }

  const forgotPassword = async (data: ForgotPasswordData): Promise<ForgotPasswordResponse> => {
    return forgotPasswordMutation.mutateAsync(data)
  }

  const resetPassword = async (data: ResetPasswordData): Promise<{ message: string }> => {
    return resetPasswordMutation.mutateAsync(data)
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

