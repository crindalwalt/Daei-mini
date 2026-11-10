import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/useAuth'
import { Spinner } from '../ui/Spinner'

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f6f8f7]">
        <Spinner size="lg" className="text-brand-600" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === 'admin' ? '/admin' : '/app'} replace />
  }

  return <>{children}</>
}
