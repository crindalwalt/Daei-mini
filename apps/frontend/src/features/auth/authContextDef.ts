import { createContext } from 'react'
import type { AuthResponse, ForgotPasswordData, ForgotPasswordResponse, LoginCredentials, RegisterData, ResetPasswordData, User } from '../../types/auth'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (credentials: LoginCredentials) => Promise<AuthResponse>
  register: (data: RegisterData) => Promise<AuthResponse>
  logout: () => Promise<void>
  forgotPassword: (data: ForgotPasswordData) => Promise<ForgotPasswordResponse>
  resetPassword: (data: ResetPasswordData) => Promise<{ message: string }>
  resendVerificationEmail: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

