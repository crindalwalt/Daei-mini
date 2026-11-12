export type ActivityType =
  | 'prayer'
  | 'quran'
  | 'tafseer'
  | 'reading'
  | 'habit'
  | 'goal'
  | 'exercise'
  | 'personal'
  | 'other'

export type ActivityStatus = 'pending' | 'completed' | 'missed'

export type GoalStatus = 'not_started' | 'in_progress' | 'completed' | 'paused'

export type UserStatus = 'active' | 'pending' | 'inactive' | 'suspended'

export interface Activity {
  id: number
  uuid?: string
  user_id?: number
  user_name?: string
  user_email?: string
  title: string
  description?: string | null
  activity_type: ActivityType
  scheduled_date: string
  start_time?: string | null
  end_time?: string | null
  status: ActivityStatus
  reminder_enabled?: boolean
  completed_at?: string | null
  created_at?: string
  updated_at?: string
}

export interface Group {
  id: number
  name: string
  description?: string | null
  members_count: number
  activities_count: number
  progress: number
  color?: string
  leader?: string
  members?: AdminUser[]
  created_at?: string
}

export interface AdminUser {
  id: number
  uuid?: string
  name: string
  email: string
  role: 'admin' | 'user'
  status: UserStatus
  is_active?: boolean
  is_suspended?: boolean
  suspended_at?: string | null
  group?: string | null
  groups?: { id: number; name: string; color?: string | null }[]
  joined_at: string
  last_active?: string
  activities?: number
  reports?: number
  progress?: number
  email_verified?: boolean
  invited_at?: string | null
  invitation_accepted_at?: string | null
  phone?: string | null
  location?: string | null
  bio?: string | null
}

export interface DailyReport {
  id: number
  user_id: number
  user_name?: string
  user_email?: string
  report_date: string
  summary?: string | null
  self_assessment?: string | null
  calculated_score?: number
  scheduled_count?: number
  completed_count?: number
  status?: 'submitted' | 'reviewed' | 'flagged'
  comments_count?: number
  reviewed_at?: string | null
  submitted_at?: string | null
  activities?: DailyReportActivity[]
  created_at?: string
}

export interface DailyReportActivity {
  id: number
  activity_title: string
  activity_type: ActivityType
  activity_status: ActivityStatus
  start_time?: string | null
  end_time?: string | null
}

export interface ReportComment {
  id: number
  author: string
  role?: string
  comment: string
  created_at: string
}

export interface Habit {
  id: number
  name: string
  description?: string | null
  is_active: boolean
  streak: number
  target_per_week: number
  completed_days: number
  color?: string
}

export interface HabitRecord {
  id: number
  habit_id: number
  record_date: string
  status: 'pending' | 'completed' | 'missed'
  notes?: string | null
}

export interface Goal {
  id: number
  title: string
  description?: string | null
  target_date: string
  progress: number
  status: GoalStatus
  category?: string
}

export interface JournalEntry {
  id: number
  title: string
  content: string
  mood: string
  entry_date: string
  tags?: string[]
}

export interface LibraryResource {
  id: number
  title: string
  description?: string | null
  category: string
  file_type: 'pdf' | 'audio' | 'video' | 'doc'
  visibility: 'private' | 'assigned' | 'public'
  size?: string
  bookmarked?: boolean
  created_at?: string
}

export interface NotificationItem {
  id: number
  title: string
  message: string
  type: 'activity' | 'report' | 'habit' | 'goal' | 'system' | 'prayer'
  read: boolean
  created_at: string
  link?: string
}

export interface HealthRecord {
  id: number
  record_date: string
  weight_kg?: number | null
  water_ml?: number | null
  sleep_hours?: number | null
  blood_pressure_systolic?: number | null
  blood_pressure_diastolic?: number | null
  notes?: string | null
}

export interface ExerciseRecord {
  id: number
  exercise_type: string
  title: string
  duration_minutes: number
  calories_burned: number
  recorded_at: string
  notes?: string | null
}

export interface PrayerTime {
  name: string
  arabic: string
  time: string
  status: 'completed' | 'current' | 'upcoming'
}

export interface CalendarEvent {
  id: number
  title: string
  date: string
  time?: string
  type: ActivityType
  status: ActivityStatus
}

export interface AdminStat {
  label: string
  value: number
  change: number
  trend: 'up' | 'down'
  series?: number[]
}

export interface ChartPoint {
  label: string
  value: number
  secondary?: number
}
