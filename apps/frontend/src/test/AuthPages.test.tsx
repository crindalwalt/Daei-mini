import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RegisterPage } from '../pages/RegisterPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import * as authHook from '../features/auth/useAuth'

vi.mock('../features/auth/useAuth')

describe('Auth Pages Styling & Flow', () => {
  const mockAuth = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerificationEmail: vi.fn(),
  }

  it('renders RegisterPage with brand styling and validation errors', async () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue(mockAuth)

    render(
      <MemoryRouter>
        <RegisterPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: /create your account/i })).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /create account/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument()
      expect(screen.getByText(/email is required/i)).toBeInTheDocument()
    })
  })

  it('renders ForgotPasswordPage and handles OTP submission', async () => {
    const forgotPasswordMock = vi.fn().mockResolvedValue({ message: 'Code sent' })
    vi.spyOn(authHook, 'useAuth').mockReturnValue({
      ...mockAuth,
      forgotPassword: forgotPasswordMock,
    })

    render(
      <MemoryRouter>
        <ForgotPasswordPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: /forgot your password\?/i })).toBeInTheDocument()
    const emailInput = screen.getByLabelText(/email address/i)
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } })

    const submitBtn = screen.getByRole('button', { name: /send one-time code/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(forgotPasswordMock).toHaveBeenCalledWith({ email: 'user@example.com' })
      expect(screen.getByText(/check your inbox/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /enter the one-time code/i })).toBeInTheDocument()
    })
  })

  it('renders ResetPasswordPage with form fields and links', () => {
    vi.spyOn(authHook, 'useAuth').mockReturnValue(mockAuth)

    render(
      <MemoryRouter initialEntries={['/reset-password?email=test@example.com&token=123456']}>
        <ResetPasswordPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { level: 1, name: /choose a new password/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/one-time code/i)).toHaveValue('123456')
    expect(screen.getByLabelText(/email address/i)).toHaveValue('test@example.com')
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument()
  })
})
