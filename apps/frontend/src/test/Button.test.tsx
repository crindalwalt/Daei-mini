import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '../components/ui/Button'

describe('Button Component', () => {
  it('renders button with label', () => {
    render(<Button>Click Me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('triggers onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Submit</Button>)

    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('displays loading spinner and disables button when isLoading is true', () => {
    render(<Button isLoading>Processing</Button>)
    const button = screen.getByRole('button')

    expect(button).toBeDisabled()
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  })

  it('applies variant styling', () => {
    const { container } = render(<Button variant="destructive">Delete</Button>)
    expect(container.firstChild).toHaveClass('bg-red-600')
  })
})

