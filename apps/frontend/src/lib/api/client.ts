export class ApiError extends Error {
  status: number
  errors?: Record<string, string[]>
  raw?: unknown

  constructor(
    status: number,
    message: string,
    errors?: Record<string, string[]>,
    raw?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.raw = raw
  }
}

const TOKEN_KEY = 'daei.auth.token'

class ApiClient {
  private baseUrl: string
  private csrfInitialized = false
  private onUnauthorizedCallback?: () => void

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || ''
  }

  /**
   * Register a listener for 401 Unauthorized responses to synchronize auth state.
   */
  public onUnauthorized(callback: () => void): void {
    this.onUnauthorizedCallback = callback
  }

  public getToken(): string | null {
    if (typeof window === 'undefined') return null
    try {
      return window.localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  }

  public setToken(token?: string | null): void {
    if (typeof window === 'undefined') return
    try {
      if (token) window.localStorage.setItem(TOKEN_KEY, token)
      else window.localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Storage can be unavailable in private browsing — ignore.
    }
  }

  /**
   * Helper to retrieve cookie value by name from document.cookie
   */
  private getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null
    const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`))
    return match ? decodeURIComponent(match[3]) : null
  }

  /**
   * Initialize Sanctum CSRF cookie for SPA session authentication.
   */
  public async ensureCsrfToken(force = false): Promise<void> {
    if (this.csrfInitialized && !force) return

    try {
      await fetch('/sanctum/csrf-cookie', {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
        },
      })
      this.csrfInitialized = true
    } catch (err) {
      console.warn('Failed to initialize CSRF cookie:', err)
    }
  }

  /**
   * Core request wrapper with automatic CSRF initialization and 419 retry.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const method = (options.method || 'GET').toUpperCase()
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

    if (isMutation) {
      await this.ensureCsrfToken()
    }

    const xsrfToken = this.getCookie('XSRF-TOKEN')
    const bearer = this.getToken()

    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      ...(options.headers as Record<string, string>),
    }

    let url: string
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
      url = endpoint
    } else {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      const cleanBase = this.baseUrl.replace(/\/+$/, '')
      if (cleanBase && !cleanEndpoint.startsWith(cleanBase)) {
        url = `${cleanBase}${cleanEndpoint}`
      } else {
        url = cleanEndpoint
      }
    }

    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    })

    // Automatic retry on 419 (CSRF token mismatch) once after refreshing CSRF cookie
    if (response.status === 419 && !isRetry && isMutation) {
      this.csrfInitialized = false
      await this.ensureCsrfToken(true)
      return this.request<T>(endpoint, options, true)
    }

    if (!response.ok) {
      let errorData: any = null
      let message = `Request failed with status ${response.status}`

      if (response.status === 429) {
        message = 'Too many requests. Please wait a moment and try again.'
      }

      try {
        errorData = await response.json()
        message = errorData.message || message
      } catch {
        // Fallback for non-JSON responses
      }

      if (response.status === 401) {
        this.setToken(null)
        this.onUnauthorizedCallback?.()
      }

      throw new ApiError(response.status, message, errorData?.errors, errorData)
    }

    if (response.status === 204) {
      return {} as T
    }

    return response.json() as Promise<T>
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  public post<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined,
    })
  }

  public put<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined,
    })
  }

  public patch<T>(endpoint: string, data?: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data instanceof FormData ? data : data !== undefined ? JSON.stringify(data) : undefined,
    })
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
