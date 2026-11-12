import { apiClient, ApiError } from './client'
import type { ApiEnvelope, PaginationMeta } from '../../types/api'
import type {
  Activity,
  ActivityType,
  AdminStat,
  AdminUser,
  ChartPoint,
  DailyReport,
  Group,
  ReportComment,
} from '../../types/domain'

export interface AdminUserStats {
  total: number
  active: number
  pending: number
  admins: number
}

export interface AdminGroupStats {
  total: number
  members: number
  average_completion: number
}

export interface AdminReportStats {
  average: number
  submitted: number
  reviewed: number
  flagged: number
}

export interface AdminActivityStats {
  total: number
  completed: number
  pending: number
  missed: number
}

export interface AdminPagedResult<T, Stats> {
  items: T[]
  stats: Stats
  meta: PaginationMeta
}

export interface AdminDashboard {
  stats: AdminStat[]
  completion: {
    rate: number
    completed: number
    in_progress: number
    missed: number
  }
  progress_overview: {
    user_growth: number
    group_activity: number
    report_generation: number
  }
  recent_users: AdminUser[]
  recent_reports: DailyReport[]
  charts: {
    weekly: ChartPoint[]
    monthly: ChartPoint[]
  }
  pending_reports: number
  reports_processed: number
  average_score: number
}

export interface AdminSearchResults {
  query: string
  users: AdminUser[]
  groups: Group[]
  reports: DailyReport[]
}

export interface AdminAnalytics {
  range: number
  stats: {
    active_users: number
    total_users: number
    average_completion: number
    activities_logged: number
    reports_submitted: number
    activities_change: number
    reports_change: number
  }
  type_breakdown: { type: ActivityType; value: number }[]
  completion_trend: ChartPoint[]
  activity_volume: ChartPoint[]
  top_users: AdminUser[]
  groups: Group[]
  highlights: {
    most_consistent_group: string | null
    most_consistent_score: number
    best_day: string | null
    best_day_count: number
    reports_awaiting_review: number
  }
}

export interface AdminUserDetail {
  user: AdminUser
  reports: DailyReport[]
  activities: Activity[]
}

export interface AdminGroupDetail {
  group: Group
}

export interface AdminReportDetail {
  report: DailyReport
  member: AdminUser | null
  comments: ReportComment[]
}

export interface AdminUserInput {
  name: string
  email: string
  role: 'admin' | 'user'
  group_id?: number | null
  status: 'active' | 'pending' | 'inactive'
  send_invitation?: boolean
}

export interface AdminGroupInput {
  name: string
  description?: string | null
  leader?: string | null
  color?: string | null
  member_ids?: number[]
}

type QueryValue = string | number | boolean | undefined | null

function query(params?: Record<string, QueryValue>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

function toPaged<T, Stats>(response: ApiEnvelope<{ items: T[]; stats: Stats }>): AdminPagedResult<T, Stats> {
  return {
    items: response.data?.items ?? [],
    stats: response.data?.stats as Stats,
    meta:
      response.meta ?? {
        current_page: 1,
        per_page: response.data?.items?.length ?? 0,
        total: response.data?.items?.length ?? 0,
        last_page: 1,
      },
  }
}

async function downloadCsv(endpoint: string, fallbackName: string): Promise<void> {
  const token = apiClient.getToken()
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: 'text/csv, application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    let message = `Export failed with status ${response.status}`
    try {
      const payload = await response.json()
      message = payload.message ?? message
    } catch {
      // Response was not JSON.
    }
    throw new ApiError(response.status, message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition)
  const filename = match?.[1] ?? fallbackName
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

export const adminApi = {
  dashboard: async (): Promise<AdminDashboard> => {
    const response = await apiClient.get<ApiEnvelope<AdminDashboard>>('/api/v1/admin/dashboard')
    return response.data
  },

  search: async (term: string): Promise<AdminSearchResults> => {
    const response = await apiClient.get<ApiEnvelope<AdminSearchResults>>(
      `/api/v1/admin/search${query({ q: term })}`
    )
    return response.data
  },

  analytics: async (range: number): Promise<AdminAnalytics> => {
    const response = await apiClient.get<ApiEnvelope<AdminAnalytics>>(
      `/api/v1/admin/analytics${query({ range })}`
    )
    return response.data
  },

  exportAnalytics: (range: number) =>
    downloadCsv(`/api/v1/admin/analytics/export${query({ range })}`, `analytics-${stamp()}.csv`),

  users: {
    list: async (params?: {
      q?: string
      role?: string
      status?: string
      group_id?: number | string
      page?: number
      per_page?: number
    }) => {
      const response = await apiClient.get<ApiEnvelope<{ items: AdminUser[]; stats: AdminUserStats }>>(
        `/api/v1/admin/users${query(params)}`
      )
      return toPaged<AdminUser, AdminUserStats>(response)
    },
    get: async (id: number | string): Promise<AdminUserDetail> => {
      const response = await apiClient.get<ApiEnvelope<AdminUserDetail>>(`/api/v1/admin/users/${id}`)
      return response.data
    },
    create: async (payload: AdminUserInput) => {
      const response = await apiClient.post<ApiEnvelope<{ user: AdminUser; invitation_sent: boolean }>>(
        '/api/v1/admin/users',
        payload
      )
      return response.data
    },
    update: async (id: number | string, payload: Partial<AdminUserInput>) => {
      const response = await apiClient.patch<ApiEnvelope<{ user: AdminUser }>>(
        `/api/v1/admin/users/${id}`,
        payload
      )
      return response.data.user
    },
    toggleStatus: async (id: number | string) => {
      const response = await apiClient.post<ApiEnvelope<{ user: AdminUser }>>(
        `/api/v1/admin/users/${id}/toggle-status`
      )
      return response.data.user
    },
    toggleSuspension: async (id: number | string) => {
      const response = await apiClient.post<ApiEnvelope<{ user: AdminUser }>>(
        `/api/v1/admin/users/${id}/toggle-suspension`
      )
      return response.data.user
    },
    export: (params?: { q?: string; role?: string; status?: string; group_id?: number | string }) =>
      downloadCsv(`/api/v1/admin/users/export${query(params)}`, `users-${stamp()}.csv`),
  },

  groups: {
    list: async (params?: { q?: string; page?: number; per_page?: number }) => {
      const response = await apiClient.get<ApiEnvelope<{ items: Group[]; stats: AdminGroupStats }>>(
        `/api/v1/admin/groups${query(params)}`
      )
      return toPaged<Group, AdminGroupStats>(response)
    },
    get: async (id: number | string): Promise<Group> => {
      const response = await apiClient.get<ApiEnvelope<{ group: Group }>>(`/api/v1/admin/groups/${id}`)
      return response.data.group
    },
    create: async (payload: AdminGroupInput): Promise<Group> => {
      const response = await apiClient.post<ApiEnvelope<{ group: Group }>>(
        '/api/v1/admin/groups',
        payload
      )
      return response.data.group
    },
    update: async (id: number | string, payload: Partial<AdminGroupInput>): Promise<Group> => {
      const response = await apiClient.patch<ApiEnvelope<{ group: Group }>>(
        `/api/v1/admin/groups/${id}`,
        payload
      )
      return response.data.group
    },
    export: (params?: { q?: string }) =>
      downloadCsv(`/api/v1/admin/groups/export${query(params)}`, `groups-${stamp()}.csv`),
  },

  reports: {
    list: async (params?: {
      q?: string
      status?: string
      date?: string
      user_id?: number | string
      page?: number
      per_page?: number
    }) => {
      const response = await apiClient.get<
        ApiEnvelope<{ items: DailyReport[]; stats: AdminReportStats }>
      >(`/api/v1/admin/reports${query(params)}`)
      return toPaged<DailyReport, AdminReportStats>(response)
    },
    get: async (id: number | string): Promise<AdminReportDetail> => {
      const response = await apiClient.get<ApiEnvelope<AdminReportDetail>>(
        `/api/v1/admin/reports/${id}`
      )
      return response.data
    },
    updateStatus: async (id: number | string, status: 'submitted' | 'reviewed' | 'flagged') => {
      const response = await apiClient.patch<ApiEnvelope<{ report: DailyReport }>>(
        `/api/v1/admin/reports/${id}/status`,
        { status }
      )
      return response.data.report
    },
    addComment: async (id: number | string, comment: string): Promise<ReportComment> => {
      const response = await apiClient.post<ApiEnvelope<ReportComment>>(
        `/api/v1/admin/reports/${id}/comments`,
        { comment }
      )
      return response.data
    },
    export: (params?: { q?: string; status?: string; date?: string; user_id?: number | string }) =>
      downloadCsv(`/api/v1/admin/reports/export${query(params)}`, `daily-reports-${stamp()}.csv`),
  },

  activities: {
    list: async (params?: {
      q?: string
      type?: string
      status?: string
      user_id?: number | string
      page?: number
      per_page?: number
    }) => {
      const response = await apiClient.get<
        ApiEnvelope<{ items: Activity[]; stats: AdminActivityStats }>
      >(`/api/v1/admin/activities${query(params)}`)
      return toPaged<Activity, AdminActivityStats>(response)
    },
    complete: async (id: number | string): Promise<Activity> => {
      const response = await apiClient.post<ApiEnvelope<{ activity: Activity }>>(
        `/api/v1/admin/activities/${id}/complete`
      )
      return response.data.activity
    },
    export: (params?: { q?: string; type?: string; status?: string; user_id?: number | string }) =>
      downloadCsv(`/api/v1/admin/activities/export${query(params)}`, `activities-${stamp()}.csv`),
  },
}
