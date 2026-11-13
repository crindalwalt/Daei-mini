import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import * as authHook from '../features/auth/useAuth'

vi.mock('../features/auth/useAuth')
vi.mock('../lib/api/admin', () => ({
  adminApi: {
    dashboard: vi.fn().mockResolvedValue({
      stats: [
        { label: 'Total Users', value: 248, change: 12, trend: 'up' },
        { label: 'Total Groups', value: 18, change: 0, trend: 'up' },
        { label: 'Total Activities', value: 1142, change: 15, trend: 'up' },
        { label: 'Total Reports', value: 92, change: 10, trend: 'up' },
      ],
      completion: {
        rate: 78,
        completed: 780,
        in_progress: 140,
        missed: 80,
      },
      progress_overview: {
        user_growth: 12,
        group_activity: 18,
        report_generation: 10,
      },
      recent_users: [
        { id: 1, name: 'Hamza Khan', email: 'hamza@email.com', status: 'active' },
        { id: 2, name: 'Ayesha Malik', email: 'ayesha@email.com', status: 'active' },
        { id: 3, name: 'Ali Raza', email: 'ali@email.com', status: 'pending' },
      ],
      recent_reports: [
        { id: 1024, user_name: 'Hamza Khan', report_date: '2024-05-12', status: 'completed' },
        { id: 1023, user_name: 'Ali Raza', report_date: '2024-05-11', status: 'pending' },
        { id: 1022, user_name: 'Ayesha Malik', report_date: '2024-05-10', status: 'reviewed' },
      ],
      charts: {
        weekly: [
          { label: 'Sun', value: 18, secondary: 4 },
          { label: 'Mon', value: 24, secondary: 3 },
          { label: 'Tue', value: 28, secondary: 2 },
          { label: 'Wed', value: 22, secondary: 5 },
          { label: 'Thu', value: 26, secondary: 2 },
          { label: 'Fri', value: 20, secondary: 4 },
          { label: 'Sat', value: 16, secondary: 6 },
        ],
        monthly: [],
      },
      pending_reports: 5,
      reports_processed: 25,
      average_score: 82,
    }),
  },
}))

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  vi.spyOn(authHook, 'useAuth').mockReturnValue({
    user: {
      id: 1,
      name: 'Admin User',
      email: 'admin@daeimini.com',
      email_verified_at: null,
      created_at: '',
      updated_at: '',
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendVerificationEmail: vi.fn(),
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin']}>
        <AdminDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('AdminDashboardPage', () => {
  it('renders the welcome banner with heading and description', async () => {
    renderComponent()

    expect(screen.getByRole('heading', { name: /welcome back, admin!/i })).toBeInTheDocument()
    expect(screen.getByText(/here's what's happening in your organization today/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view details/i })).toBeInTheDocument()
  })

  it('renders all four summary metric cards', async () => {
    renderComponent()

    expect(screen.getByText(/total users/i)).toBeInTheDocument()
    expect(screen.getByText(/total groups/i)).toBeInTheDocument()
    expect(screen.getByText(/total activities/i)).toBeInTheDocument()
    expect(screen.getByText(/total reports/i)).toBeInTheDocument()

    expect(screen.getByText('248')).toBeInTheDocument()
    expect(screen.getByText('18')).toBeInTheDocument()
    expect(screen.getByText('1,142')).toBeInTheDocument()
    expect(screen.getByText('92')).toBeInTheDocument()
  })

  it('renders the Activity Overview section with dropdown and legend', async () => {
    renderComponent()

    expect(await screen.findByRole('heading', { name: /activity overview/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/activity date range/i)).toBeInTheDocument()
    expect(screen.getByText(/78% completion rate/i)).toBeInTheDocument()
  })

  it('renders the Recent Users section with rows and status badges', async () => {
    renderComponent()

    expect(await screen.findByRole('heading', { name: /recent users/i })).toBeInTheDocument()
    expect(screen.getAllByText('Hamza Khan').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ayesha Malik').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Ali Raza').length).toBeGreaterThan(0)
  })

  it('renders the Recent Reports table and Progress Overview donut chart', async () => {
    renderComponent()

    expect(await screen.findByRole('heading', { name: /recent reports/i })).toBeInTheDocument()
    expect(screen.getByText('Report ID')).toBeInTheDocument()
    expect(screen.getByText('User')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: /progress overview/i })).toBeInTheDocument()
    expect(screen.getAllByText(/78%/i).length).toBeGreaterThan(0)
    expect(screen.getByText('Overall')).toBeInTheDocument()
  })

  it('renders the motivational quote card', async () => {
    renderComponent()

    expect(
      await screen.findByText(/small steps every day lead to big changes/i)
    ).toBeInTheDocument()
  })
})
