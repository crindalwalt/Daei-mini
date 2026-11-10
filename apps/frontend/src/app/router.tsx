import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { ProtectedRoute } from '../components/shared/ProtectedRoute'
import { PublicRoute } from '../components/shared/PublicRoute'
import { RoleHomeRedirect } from '../components/shared/RoleHomeRedirect'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage'
import { ResetPasswordPage } from '../pages/ResetPasswordPage'
import { NotFoundPage } from '../pages/NotFoundPage'

import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AnalyticsPage } from '../pages/admin/AnalyticsPage'
import { UsersManagementPage } from '../pages/admin/UsersManagementPage'
import { UserDetailsPage } from '../pages/admin/UserDetailsPage'
import { GroupsManagementPage } from '../pages/admin/GroupsManagementPage'
import { GroupDetailsPage } from '../pages/admin/GroupDetailsPage'
import { ActivitiesOverviewPage } from '../pages/admin/ActivitiesOverviewPage'
import { DailyReportsPage } from '../pages/admin/DailyReportsPage'
import { ReportDetailsPage } from '../pages/admin/ReportDetailsPage'
import { AdminNotificationsPage } from '../pages/admin/AdminNotificationsPage'
import { AdminProfileSettingsPage } from '../pages/admin/AdminProfileSettingsPage'

import { UserDashboardPage } from '../pages/user/UserDashboardPage'
import { CalendarPlannerPage } from '../pages/user/CalendarPlannerPage'
import { DailySchedulePage } from '../pages/user/DailySchedulePage'
import { PersonalActivitiesPage } from '../pages/user/PersonalActivitiesPage'
import { ActivityFormPage } from '../pages/user/ActivityFormPage'
import { PrayerSchedulePage } from '../pages/user/PrayerSchedulePage'
import { HabitsPage } from '../pages/user/HabitsPage'
import { GoalsPage } from '../pages/user/GoalsPage'
import { JournalListPage } from '../pages/user/JournalListPage'
import { JournalEditorPage } from '../pages/user/JournalEditorPage'
import { ReportHistoryPage } from '../pages/user/ReportHistoryPage'
import { DailyReportFormPage } from '../pages/user/DailyReportFormPage'
import { ReportDetailPage } from '../pages/user/ReportDetailPage'
import { DigitalLibraryPage } from '../pages/user/DigitalLibraryPage'
import { HealthFitnessPage } from '../pages/user/HealthFitnessPage'
import { UserNotificationsPage } from '../pages/user/UserNotificationsPage'
import { UserSettingsPage } from '../pages/user/UserSettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RoleHomeRedirect />,
  },
  {
    path: '/dashboard',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },
  {
    path: '/register',
    element: (
      <PublicRoute>
        <RegisterPage />
      </PublicRoute>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    ),
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute allowedRoles={['admin']}>
        <AppShell variant="admin" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboardPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'users', element: <UsersManagementPage /> },
      { path: 'users/:id', element: <UserDetailsPage /> },
      { path: 'groups', element: <GroupsManagementPage /> },
      { path: 'groups/:id', element: <GroupDetailsPage /> },
      { path: 'activities', element: <ActivitiesOverviewPage /> },
      { path: 'reports', element: <DailyReportsPage /> },
      { path: 'reports/:id', element: <ReportDetailsPage /> },
      { path: 'notifications', element: <AdminNotificationsPage /> },
      { path: 'settings', element: <AdminProfileSettingsPage /> },
      { path: 'dashboard', element: <Navigate to="/admin" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute allowedRoles={['user']}>
        <AppShell variant="user" />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <UserDashboardPage /> },
      { path: 'calendar', element: <CalendarPlannerPage /> },
      { path: 'schedule', element: <DailySchedulePage /> },
      { path: 'activities', element: <PersonalActivitiesPage /> },
      { path: 'activities/new', element: <ActivityFormPage /> },
      { path: 'activities/:id/edit', element: <ActivityFormPage /> },
      { path: 'prayer', element: <PrayerSchedulePage /> },
      { path: 'habits', element: <HabitsPage /> },
      { path: 'goals', element: <GoalsPage /> },
      { path: 'journal', element: <JournalListPage /> },
      { path: 'journal/new', element: <JournalEditorPage /> },
      { path: 'journal/:id', element: <JournalEditorPage /> },
      { path: 'reports', element: <ReportHistoryPage /> },
      { path: 'reports/new', element: <DailyReportFormPage /> },
      { path: 'reports/:id', element: <ReportDetailPage /> },
      { path: 'library', element: <DigitalLibraryPage /> },
      { path: 'health', element: <HealthFitnessPage /> },
      { path: 'notifications', element: <UserNotificationsPage /> },
      { path: 'settings', element: <UserSettingsPage /> },
      { path: 'dashboard', element: <Navigate to="/app" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
