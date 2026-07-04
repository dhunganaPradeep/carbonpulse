import { create } from 'zustand'
import { emissionsApi, forecastApi, regulatoryApi } from '../api/services'
import type {
  AggregationResponse,
  DimensionBreakdownResponse,
  ForecastRun,
  RegulatoryScoreResponse,
  TimeBucket,
} from '../types'

interface DashboardState {
  aggregation: AggregationResponse | null
  timeseries: TimeBucket[]
  forecast: ForecastRun | null
  categoryBreakdown: DimensionBreakdownResponse | null
  supplierBreakdown: DimensionBreakdownResponse | null
  facilityBreakdown: DimensionBreakdownResponse | null
  energySourceBreakdown: DimensionBreakdownResponse | null
  regulatory: RegulatoryScoreResponse | null
  loading: boolean
  error: string | null
  loadDashboard: () => Promise<void>
  loadForecast: () => Promise<void>
  setForecast: (forecast: ForecastRun | null) => void
  triggerForecast: () => Promise<void>
}

async function safe<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch {
    return null
  }
}

export const useDashboardStore = create<DashboardState>((set) => ({
  aggregation: null,
  timeseries: [],
  forecast: null,
  categoryBreakdown: null,
  supplierBreakdown: null,
  facilityBreakdown: null,
  energySourceBreakdown: null,
  regulatory: null,
  loading: false,
  error: null,
  
  loadDashboard: async () => {
    set({ loading: true, error: null })
    try {
      const [aggregation, timeseries] = await Promise.all([
        emissionsApi.aggregate(),
        emissionsApi.timeseries('month'),
      ])
      // Secondary widgets degrade gracefully if their source is empty.
      const [
        forecast,
        categoryBreakdown,
        supplierBreakdown,
        facilityBreakdown,
        energySourceBreakdown,
        regulatory,
      ] = await Promise.all([
        safe(forecastApi.latest()),
        safe(emissionsApi.breakdown('category')),
        safe(emissionsApi.breakdown('supplier')),
        safe(emissionsApi.breakdown('facility')),
        safe(emissionsApi.breakdown('energy_source')),
        safe(regulatoryApi.snapshot()),
      ])
      set({
        aggregation,
        timeseries,
        forecast,
        categoryBreakdown,
        supplierBreakdown,
        facilityBreakdown,
        energySourceBreakdown,
        regulatory,
      })
    } catch {
      set({ error: 'Failed to load dashboard data' })
    } finally {
      set({ loading: false })
    }
  },

  loadForecast: async () => {
    try {
      const forecast = await safe(forecastApi.latest())
      set({ forecast })
    } catch {
      set({ forecast: null })
    }
  },

  setForecast: (forecast) => {
    set({ forecast })
  },

  triggerForecast: async () => {
    await forecastApi.trigger(12)
  },
}))
