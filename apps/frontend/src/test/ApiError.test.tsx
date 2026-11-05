import { describe, it, expect } from 'vitest'
import { ApiError } from '../lib/api/client'

describe('ApiError', () => {
  it('correctly captures status code, message and field errors', () => {
    const error = new ApiError(422, 'Validation failed', {
      email: ['The email field is required.'],
    })

    expect(error.status).toBe(422)
    expect(error.message).toBe('Validation failed')
    expect(error.errors?.email).toContain('The email field is required.')
    expect(error.name).toBe('ApiError')
  })

  it('handles 429 Too Many Requests response errors', () => {
    const error = new ApiError(429, 'Too many login attempts. Please try again later.')

    expect(error.status).toBe(429)
    expect(error.message).toContain('Too many login attempts')
  })

  it('handles 403 Forbidden registration disabled errors', () => {
    const error = new ApiError(403, 'Registration is disabled.')

    expect(error.status).toBe(403)
    expect(error.message).toBe('Registration is disabled.')
  })
})
