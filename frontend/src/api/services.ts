import { apiClient } from './client'
import type {
  AdminUser,
  AggregationResponse,
  AuditEntry,
  BreakdownDimension,
  DimensionBreakdownResponse,
  EmissionInput,
  EmissionPage,
  EmissionRecord,
  EmissionScope,
  ForecastRun,
  Organisation,
  RegulatoryScoreResponse,
  SimulatorParams,
  SimulatorResult,
  TokenPair,
  User,
  UserRole,
  Task,
} from '../types'

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenPair>('/auth/login', { email, password }).then((r) => r.data),
  me: () => apiClient.get<User>('/auth/me').then((r) => r.data),
  logout: (refresh_token: string) =>
    apiClient.post('/auth/logout', { refresh_token }),
}

export const emissionsApi = {
  aggregate: () =>
    apiClient.get<AggregationResponse>('/emissions/aggregate').then((r) => r.data),
  timeseries: (granularity = 'month') =>
    apiClient
      .get<TimeBucket[]>('/emissions/timeseries', { params: { granularity } })
      .then((r) => r.data),
  breakdown: (dimension: BreakdownDimension) =>
    apiClient
      .get<DimensionBreakdownResponse>('/emissions/breakdown', {
        params: { dimension },
      })
      .then((r) => r.data),
  list: (params: {
    scope?: EmissionScope
    limit?: number
    offset?: number
  } = {}) =>
    apiClient
      .get<EmissionPage>('/emissions', { params })
      .then((r) => r.data),
  create: (payload: EmissionInput) =>
    apiClient.post<EmissionRecord>('/emissions', payload).then((r) => r.data),
  update: (id: string, payload: Partial<EmissionInput>) =>
    apiClient
      .patch<EmissionRecord>(`/emissions/${id}`, payload)
      .then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/emissions/${id}`),
}

export const forecastApi = {
  trigger: (horizon_months = 12, model = 'prophet') =>
    apiClient
      .post<ForecastRun>('/forecast/runs', { horizon_months, model })
      .then((r) => r.data),
  latest: () =>
    apiClient.get<ForecastRun>('/forecast/runs/latest').then((r) => r.data),
  get: (runId: string) =>
    apiClient.get<ForecastRun>(`/forecast/runs/${runId}`).then((r) => r.data),
}

export const simulatorApi = {
  run: (params: SimulatorParams) =>
    apiClient.post<SimulatorResult>('/simulator/run', params).then((r) => r.data),
}

export const regulatoryApi = {
  snapshot: () =>
    apiClient
      .get<RegulatoryScoreResponse>('/regulatory/snapshot')
      .then((r) => r.data),
  score: (payload: Record<string, unknown>) =>
    apiClient
      .post<RegulatoryScoreResponse>('/regulatory/score', payload)
      .then((r) => r.data),
}

export const adminApi = {
  org: () => apiClient.get<Organisation>('/admin/org').then((r) => r.data),
  updateOrg: (payload: { name?: string; industry?: string; country?: string }) =>
    apiClient.patch<Organisation>('/admin/org', payload).then((r) => r.data),
  users: () => apiClient.get<AdminUser[]>('/admin/users').then((r) => r.data),
  updateUser: (id: string, payload: { role?: UserRole; is_active?: boolean }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}`, payload).then((r) => r.data),
  audit: (limit = 50) =>
    apiClient
      .get<AuditEntry[]>('/admin/audit', { params: { limit } })
      .then((r) => r.data),
}

export const tasksApi = {
  list: () => apiClient.get<Task[]>('/tasks').then((r) => r.data),
  create: (payload: { title: string; description?: string; status?: string }) =>
    apiClient.post<Task>('/tasks', payload).then((r) => r.data),
  update: (id: string, payload: { title?: string; description?: string; status?: string }) =>
    apiClient.patch<Task>(`/tasks/${id}`, payload).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/tasks/${id}`),
}
