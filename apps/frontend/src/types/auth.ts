export interface User {
  id: number
  name: string
  email: string
  email_verified?: boolean
  email_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
  device_name?: string
}

export interface ForgotPasswordData {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
  reset_token?: string
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

export interface AuthResponse {
  user: User
  message: string
  token?: string
  token_type?: string
}

