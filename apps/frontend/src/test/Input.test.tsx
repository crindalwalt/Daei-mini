import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from '../components/ui/Input'

describe('Input Component', () => {
  it('renders input with label and helper text', () => {
    render(
      <Input
        label="Email Address"
        name="email"
        helperText="We will never share your email."
      />
    )

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByText(/we will never share your email/i)).toBeInTheDocument()
  })

  it('renders validation error message and sets aria-invalid', () => {
    render(
      <Input
        label="Password"
        name="password"
        error="Password must be at least 8 characters"
      />
    )

    const input = screen.getByLabelText(/password/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument()
  })
})

