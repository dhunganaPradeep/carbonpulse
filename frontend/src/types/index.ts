export type EmissionScope = 'scope_1' | 'scope_2' | 'scope_3'

export type UserRole = 'ADMIN' | 'ANALYST' | 'VIEWER'

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface ScopeTotal {
  scope: EmissionScope
  total_co2e_tonnes: number
}

export interface AggregationResponse {
  by_scope: ScopeTotal[]
  grand_total_co2e_tonnes: number
}

export interface TimeBucket {
  period: string
  scope: EmissionScope
  total_co2e_tonnes: number
}

export type BreakdownDimension =
  | 'category'
  | 'facility'
  | 'energy_source'
  | 'supplier'

export interface DimensionTotal {
  key: string
  total_co2e_tonnes: number
}

export interface DimensionBreakdownResponse {
  dimension: string
  items: DimensionTotal[]
  grand_total_co2e_tonnes: number
}

export interface EmissionRecord {
  id: string
  org_id: string
  recorded_on: string
  scope: EmissionScope
  co2e_tonnes: number
  category: string | null
  facility: string | null
  energy_source: string | null
  source: string | null
  supplier_id: string | null
}

export interface EmissionPage {
  items: EmissionRecord[]
  total: number
  limit: number
  offset: number
}

export interface EmissionInput {
  recorded_on: string
  scope: EmissionScope
  co2e_tonnes: number
  category?: string | null
  facility?: string | null
  energy_source?: string | null
  source?: string | null
}

export interface ForecastPoint {
  forecast_date: string
  yhat: number
  yhat_lower: number
  yhat_upper: number
  scope: string | null
}

export interface ForecastRun {
  id: string
  org_id: string
  model: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  horizon_months: number
  started_at: string | null
  completed_at: string | null
  error: string | null
  metrics: string | null
  created_at: string
  points: ForecastPoint[]
}

export interface SimulatorParams {
  renewable_energy_pct: number
  fleet_ev_pct: number
  supplier_reduction_pct: number
  carbon_tax_rate: number
  production_volume_change_pct: number
}

export interface SimulatedPoint {
  forecast_date: string
  baseline: number
  simulated: number
}

export interface SimulatorResult {
  points: SimulatedPoint[]
  baseline_total: number
  simulated_total: number
  reduction_pct: number
  estimated_carbon_tax: number
}

export interface Organisation {
  id: string
  name: string
  slug: string
  industry: string | null
  country: string | null
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  is_active: boolean
  created_at: string
}

export interface AuditEntry {
  id: string
  user_id: string | null
  action: string
  entity: string | null
  detail: string | null
  created_at: string
}

export interface FrameworkScore {
  framework: string
  score: number
  rationale: string
}

export interface RegulatoryScoreResponse {
  overall_risk_score: number
  frameworks: FrameworkScore[]
}

export type TaskStatus = 'todo' | 'in_progress' | 'done'

export interface Task {
  id: string
  org_id: string
  title: string
  description: string | null
  status: TaskStatus
  created_at: string
  updated_at: string
}
