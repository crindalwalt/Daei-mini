import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Activity,
  CheckCircle2,
  Database,
  ListTodo,
  PlayCircle,
  RefreshCw,
  Server,
  Shield,
  Zap,
} from 'lucide-react'
import { useAuth } from '../features/auth/useAuth'
import { apiClient, ApiError } from '../lib/api/client'
import type { HealthStatus, DemoTask } from '../types/api'
import { Navbar } from '../components/shared/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'

export function DashboardPage() {
  const { user } = useAuth()
  const [queueMessage, setQueueMessage] = useState<string | null>(null)
  const [adminCheckResult, setAdminCheckResult] = useState<{
    success: boolean
    message: string
  } | null>(null)

  // System Health Query
  const {
    data: health,
    isLoading: healthLoading,
    refetch: refetchHealth,
    isRefetching: healthRefetching,
  } = useQuery<HealthStatus>({
    queryKey: ['system', 'health'],
    queryFn: () => apiClient.get<HealthStatus>('/api/v1/health'),
    refetchInterval: 30000,
  })

  // Demo Tasks Query
  const { data: tasksData, isLoading: tasksLoading } = useQuery<{
    tasks: DemoTask[]
  }>({
    queryKey: ['demo', 'tasks'],
    queryFn: () => apiClient.get<{ tasks: DemoTask[] }>('/api/v1/tasks'),
  })

  // Dispatch Queue Job Mutation
  const queueMutation = useMutation({
    mutationFn: () =>
      apiClient.post<{ status: string; message: string }>('/api/v1/queue-test'),
    onSuccess: (data) => {
      setQueueMessage(data.message)
      setTimeout(() => setQueueMessage(null), 5000)
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setQueueMessage(`Error: ${err.message}`)
      } else {
        setQueueMessage('Failed to dispatch queue job.')
      }
    },
  })

  // Admin Gate Authorization Mutation
  const adminCheckMutation = useMutation({
    mutationFn: () =>
      apiClient.get<{ message: string; user: string }>('/api/v1/admin-check'),
    onSuccess: (data) => {
      setAdminCheckResult({
        success: true,
        message: data.message,
      })
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setAdminCheckResult({
          success: false,
          message: `${err.status} Forbidden: ${err.message}`,
        })
      } else {
        setAdminCheckResult({
          success: false,
          message: 'Authorization check failed.',
        })
      }
    },
  })

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Engineering Milestones 1, 2 & 3 Active
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-sm md:text-base text-blue-100 max-w-2xl">
                This full-stack template is verified with Laravel 13, React 19,
                Sanctum SPA authentication, PostgreSQL, and Redis.
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="block text-xs text-blue-200">Logged in as</span>
              <span className="font-mono text-sm font-semibold">{user?.email}</span>
            </div>
          </div>
        </div>

        {/* Status and Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Health Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  System Health
                </CardTitle>
                <CardDescription>Live backend and service checks</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchHealth()}
                disabled={healthRefetching}
                title="Refresh Health"
                className="p-1 h-8 w-8"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${healthRefetching ? 'animate-spin' : ''}`}
                />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              {healthLoading ? (
                <div className="flex items-center justify-center py-6 text-slate-400">
                  <Spinner size="md" />
                </div>
              ) : health ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                    <span className="text-slate-500">API Status</span>
                    <Badge variant={health.status === 'healthy' ? 'success' : 'destructive'}>
                      {health.status}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-slate-400" />
                      PostgreSQL
                    </span>
                    <Badge
                      variant={
                        health.services.database?.status === 'up'
                          ? 'success'
                          : 'destructive'
                      }
                    >
                      {health.services.database?.status || 'unknown'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm py-1 border-b border-slate-100">
                    <span className="text-slate-500 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-slate-400" />
                      Redis
                    </span>
                    <Badge
                      variant={
                        health.services.redis?.status === 'up'
                          ? 'success'
                          : health.services.redis?.status === 'skipped'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {health.services.redis?.status || 'skipped'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                    <span>Laravel {health.version.laravel}</span>
                    <span>Env: {health.environment}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-red-500">Health check unavailable</p>
              )}
            </CardContent>
          </Card>

          {/* Queue Verification Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Queue & Background Jobs
              </CardTitle>
              <CardDescription>
                Verify asynchronous Redis queue workers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatch an example job (<code>ProcessExampleJob</code>) to the
                Redis queue. The worker process processes it asynchronously.
              </p>

              {queueMessage && (
                <Alert variant="info" className="text-xs p-3">
                  {queueMessage}
                </Alert>
              )}

              <Button
                variant="default"
                size="sm"
                className="w-full"
                isLoading={queueMutation.isPending}
                onClick={() => queueMutation.mutate()}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Dispatch Test Job to Queue
              </Button>
            </CardContent>
          </Card>

          {/* Authorization Check Card */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                Laravel Gate Authorization
              </CardTitle>
              <CardDescription>
                Verify native policies and gate enforcement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <p className="text-xs text-slate-600 leading-relaxed">
                Tests <code>Gate::authorize('view-admin-dashboard')</code>.
                Allows <code>admin@thinkcode.dev</code> or <code>*@thinkcode.dev</code> emails; rejects others with 403.
              </p>

              {adminCheckResult && (
                <Alert
                  variant={adminCheckResult.success ? 'success' : 'destructive'}
                  className="text-xs p-3"
                >
                  {adminCheckResult.message}
                </Alert>
              )}

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                isLoading={adminCheckMutation.isPending}
                onClick={() => adminCheckMutation.mutate()}
              >
                <Shield className="w-4 h-4 mr-2" />
                Check Admin Permission
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Demo Tasks Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="w-4 h-4 text-blue-600" />
              Template Roadmap & Demonstration Tasks
            </CardTitle>
            <CardDescription>
              Retrieved from protected API endpoint <code>GET /api/v1/tasks</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasksLoading ? (
              <div className="flex justify-center py-6 text-slate-400">
                <Spinner size="md" />
              </div>
            ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {tasksData.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="py-3 flex items-center justify-between text-sm"
                  >
                    <div className="space-y-0.5">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        Assigned to: {task.assigned_to}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.status === 'completed'
                          ? 'success'
                          : task.status === 'in_progress'
                          ? 'warning'
                          : 'secondary'
                      }
                    >
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No tasks found</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
