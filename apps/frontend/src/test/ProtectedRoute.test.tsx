import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../components/shared/ProtectedRoute'
import * as authHook from '../features/auth/useAuth'

vi.mock('../features/auth/useAuth')

describe('ProtectedRoute', () => {
  it('renders loading indicator when auth is loading', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText(/verifying session/i)).toBeInTheDocument()
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument()
  })

  it('redirects to /login when unauthenticated', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/login page/i)).toBeInTheDocument()
    expect(screen.queryByText(/protected content/i)).not.toBeInTheDocument()
  })

  it('renders protected child component when authenticated', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: {
        id: 1,
        name: 'Ada Lovelace',
        email: 'ada@thinkcode.dev',
        email_verified_at: null,
        created_at: '',
        updated_at: '',
      },
      isLoading: false,
      isAuthenticated: true,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      resendVerificationEmail: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </MemoryRouter>
    )

    expect(screen.getByText(/protected content/i)).toBeInTheDocument()
  })
})

