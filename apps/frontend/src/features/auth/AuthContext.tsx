import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../../lib/api/client'
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../../types/auth'
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

  const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    return loginMutation.mutateAsync(credentials)
  }

  const register = async (regData: RegisterData): Promise<AuthResponse> => {
    return registerMutation.mutateAsync(regData)
  }

  const logout = async (): Promise<void> => {
    await logoutMutation.mutateAsync()
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

