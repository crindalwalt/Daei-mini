import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage'
import * as authHook from '../features/auth/useAuth'
import { ApiError } from '../lib/api/client'

vi.mock('../features/auth/useAuth')

describe('LoginPage', () => {
  it('displays validation errors when submitted with empty fields', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    })
  })

  it('renders a forgot password link before the password field', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot password/i })
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password')
  })

  it('populates demo credentials when clicking demo button', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const demoBtn = screen.getByRole('button', { name: /fill demo credentials/i })
    fireEvent.click(demoBtn)

    const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement

    expect(emailInput.value).toBe('admin@thinkcode.dev')
    expect(passwordInput.value).toBe('password')
  })

  it('displays server rate limit error message when login is throttled', async () => {
    const mockLogin = vi.fn().mockRejectedValue(
      new ApiError(429, 'Too many login attempts. Please try again later.')
    )

    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: vi.fn(),
      logout: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
    })

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

    const demoBtn = screen.getByRole('button', { name: /fill demo credentials/i })
    fireEvent.click(demoBtn)

    const submitBtn = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/too many login attempts/i)).toBeInTheDocument()
    })
  })
})
