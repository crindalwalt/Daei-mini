export type UserRole = 'admin' | 'user'

export interface PrayerPreferences {
  timezone?: string
  calculation_method?: string
  latitude?: number | null
  longitude?: number | null
  notifications_enabled?: boolean
}

export interface User {
  id: number
  uuid?: string
  name: string
  email: string
  bio?: string | null
  email_verified?: boolean
  email_verified_at?: string | null
  role?: UserRole
  roles?: string[]
  is_active?: boolean
  avatar_url?: string | null
  phone?: string | null
  timezone?: string
  prayer_preferences?: PrayerPreferences
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
  device_name?: string
  remember?: boolean
}

export interface ForgotPasswordData {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ResetPasswordData {
  token: string
  email: string
  password: string
  password_confirmation: string
}

export interface RegisterData {
  name: string
  email: string
  password: string
  password_confirmation: string
  device_name?: string
}

export interface AuthPayload {
  user: User
  token?: string
  token_type?: string
  abilities?: string[]
}

export interface AuthResponse {
  user: User
  message: string
  token?: string
  token_type?: string
  abilities?: string[]
}

export interface UpdateProfileData {
  name?: string
  email?: string
  bio?: string | null
  timezone?: string
  calculation_method?: string
  latitude?: number | null
  longitude?: number | null
  notifications_enabled?: boolean
}

export interface UpdatePasswordData {
  current_password: string
  password: string
  password_confirmation: string
}
