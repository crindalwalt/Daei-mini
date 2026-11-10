export interface PaginationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
  from?: number | null
  to?: number | null
}

export interface ApiEnvelope<T> {
  success: boolean
  data: T
  message: string
  errors?: Record<string, string[]>
  meta?: PaginationMeta
}

export interface HealthStatus {
  status: 'healthy' | 'degraded'
  timestamp: string
  environment: string
  version: {
    laravel: string
    php: string
  }
  services: {
    database?: {
      status: 'up' | 'down'
      driver?: string
      error?: string
    }
    redis?: {
      status: 'up' | 'down' | 'skipped'
      error?: string
      note?: string
    }
  }
}

export interface DemoTask {
  id: number
  title: string
  status: 'completed' | 'in_progress' | 'pending'
  assigned_to: string
}
