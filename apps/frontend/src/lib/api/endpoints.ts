import { apiClient, ApiError } from './client'
import type { ApiEnvelope } from '../../types/api'
import type {
  Activity,
  DailyReport,
  ExerciseRecord,
  Goal,
  Habit,
  HealthRecord,
  LibraryResource,
  NotificationItem,
  ReportComment,
} from '../../types/domain'
import type { UpdatePasswordData, UpdateProfileData, User } from '../../types/auth'

function query(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value))
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

async function unwrap<T>(promise: Promise<ApiEnvelope<T>>): Promise<T> {
  const response = await promise
  return response.data
}

export interface ListResult<T> {
  items: T[]
  nextPage: number | null
  total: number
}

async function downloadBlob(endpoint: string, fallbackName: string): Promise<void> {
  const token = apiClient.getToken()
  const response = await fetch(endpoint, {
    method: 'GET',
    credentials: 'include',
    headers: {
      Accept: '*/*',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    let message = `Download failed with status ${response.status}`
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

function toList<T>(response: ApiEnvelope<T[]>): ListResult<T> {
  const meta = response.meta
  return {
    items: response.data ?? [],
    nextPage:
      meta && meta.current_page < meta.last_page ? meta.current_page + 1 : null,
    total: meta?.total ?? response.data?.length ?? 0,
  }
}

export const authApi = {
  me: () => unwrap<User>(apiClient.get<ApiEnvelope<User>>('/api/v1/auth/me')),
  updateProfile: (payload: UpdateProfileData) =>
    unwrap<User>(apiClient.patch<ApiEnvelope<User>>('/api/v1/auth/profile', payload)),
  changePassword: (payload: UpdatePasswordData) =>
    apiClient.patch<ApiEnvelope<null>>('/api/v1/auth/password', payload),
}

export const activitiesApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<Activity[]>>(`/api/v1/activities${query(params)}`)
    ),
  create: (payload: Partial<Activity>) =>
    unwrap<Activity>(apiClient.post<ApiEnvelope<Activity>>('/api/v1/activities', payload)),
  update: (id: number, payload: Partial<Activity>) =>
    unwrap<Activity>(apiClient.patch<ApiEnvelope<Activity>>(`/api/v1/activities/${id}`, payload)),
  remove: (id: number) => apiClient.delete<ApiEnvelope<null>>(`/api/v1/activities/${id}`),
  complete: (id: number) =>
    unwrap<Activity>(apiClient.post<ApiEnvelope<Activity>>(`/api/v1/activities/${id}/complete`)),
}

export const habitsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(await apiClient.get<ApiEnvelope<Habit[]>>(`/api/v1/habits${query(params)}`)),
  create: (payload: Partial<Habit>) =>
    unwrap<Habit>(apiClient.post<ApiEnvelope<Habit>>('/api/v1/habits', payload)),
  update: (id: number, payload: Partial<Habit>) =>
    unwrap<Habit>(apiClient.patch<ApiEnvelope<Habit>>(`/api/v1/habits/${id}`, payload)),
  toggle: (id: number, payload?: { record_date?: string; status?: string; notes?: string }) =>
    unwrap<Habit>(
      apiClient.post<ApiEnvelope<Habit>>(`/api/v1/habits/${id}/toggle`, payload ?? {})
    ),
  remove: (id: number) => apiClient.delete<ApiEnvelope<null>>(`/api/v1/habits/${id}`),
}

export const goalsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(await apiClient.get<ApiEnvelope<Goal[]>>(`/api/v1/goals${query(params)}`)),
  create: (payload: Partial<Goal>) =>
    unwrap<Goal>(apiClient.post<ApiEnvelope<Goal>>('/api/v1/goals', payload)),
  update: (id: number, payload: Partial<Goal>) =>
    unwrap<Goal>(apiClient.patch<ApiEnvelope<Goal>>(`/api/v1/goals/${id}`, payload)),
  updateProgress: (id: number, progress: number, status?: string) =>
    unwrap<Goal>(
      apiClient.patch<ApiEnvelope<Goal>>(`/api/v1/goals/${id}/progress`, { progress, status })
    ),
  remove: (id: number) => apiClient.delete<ApiEnvelope<null>>(`/api/v1/goals/${id}`),
}

export const reportsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<DailyReport[]>>(`/api/v1/daily-reports${query(params)}`)
    ),
  get: (id: number) =>
    unwrap<DailyReport>(apiClient.get<ApiEnvelope<DailyReport>>(`/api/v1/daily-reports/${id}`)),
  create: (payload: Partial<DailyReport>) =>
    unwrap<DailyReport>(
      apiClient.post<ApiEnvelope<DailyReport>>('/api/v1/daily-reports', payload)
    ),
  update: (id: number, payload: Partial<DailyReport>) =>
    unwrap<DailyReport>(
      apiClient.patch<ApiEnvelope<DailyReport>>(`/api/v1/daily-reports/${id}`, payload)
    ),
  remove: (id: number) => apiClient.delete<ApiEnvelope<null>>(`/api/v1/daily-reports/${id}`),
  comments: (id: number) =>
    unwrap<ReportComment[]>(
      apiClient.get<ApiEnvelope<ReportComment[]>>(`/api/v1/daily-reports/${id}/comments`)
    ),
  addComment: (id: number, comment: string) =>
    unwrap<ReportComment>(
      apiClient.post<ApiEnvelope<ReportComment>>(`/api/v1/daily-reports/${id}/comments`, {
        comment,
      })
    ),
}

export const notificationsApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<NotificationItem[]>>(`/api/v1/notifications${query(params)}`)
    ),
  unreadCount: () =>
    unwrap<{ unread_count: number }>(
      apiClient.get<ApiEnvelope<{ unread_count: number }>>('/api/v1/notifications/unread-count')
    ),
  markAllRead: () =>
    apiClient.post<ApiEnvelope<null>>('/api/v1/notifications/read-all'),
  markRead: (id: number) =>
    apiClient.post<ApiEnvelope<null>>(`/api/v1/notifications/${id}/read`),
  remove: (id: number) => apiClient.delete<ApiEnvelope<null>>(`/api/v1/notifications/${id}`),
}

export interface LibraryUploadInput {
  title: string
  description?: string
  category?: string
  visibility: LibraryResource['visibility']
  status?: 'active' | 'archived'
  file: File
}

export interface LibraryItem {
  id: number
  uuid?: string
  title: string
  description?: string | null
  category?: string | null
  file_name: string
  mime_type?: string | null
  file_size?: number
  visibility: LibraryResource['visibility']
  status?: string
  is_bookmarked?: boolean
  download_url?: string
  created_at?: string | null
  updated_at?: string | null
}

export const libraryApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<LibraryItem[]>>(`/api/v1/library${query(params)}`)
    ),
  create: (input: LibraryUploadInput) => {
    const form = new FormData()
    form.append('title', input.title)
    if (input.description) form.append('description', input.description)
    if (input.category) form.append('category', input.category)
    form.append('visibility', input.visibility)
    form.append('status', input.status ?? 'active')
    form.append('file', input.file)
    return unwrap<LibraryItem>(
      apiClient.post<ApiEnvelope<LibraryItem>>('/api/v1/library', form)
    )
  },
  download: (id: number, fallbackName: string) =>
    downloadBlob(`/api/v1/library/${id}/download`, fallbackName),
}

export const healthApi = {
  list: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<HealthRecord[]>>(`/api/v1/health-records${query(params)}`)
    ),
  summary: () =>
    unwrap<Record<string, number | null>>(
      apiClient.get<ApiEnvelope<Record<string, number | null>>>('/api/v1/health-records/summary')
    ),
  create: (payload: Partial<HealthRecord>) =>
    unwrap<HealthRecord>(
      apiClient.post<ApiEnvelope<HealthRecord>>('/api/v1/health-records', payload)
    ),
  exercises: async (params?: Record<string, string | number | boolean | undefined>) =>
    toList(
      await apiClient.get<ApiEnvelope<ExerciseRecord[]>>(
        `/api/v1/exercise-records${query(params)}`
      )
    ),
  createExercise: (payload: Partial<ExerciseRecord>) =>
    unwrap<ExerciseRecord>(
      apiClient.post<ApiEnvelope<ExerciseRecord>>('/api/v1/exercise-records', payload)
    ),
}
