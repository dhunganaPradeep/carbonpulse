import { create } from 'zustand'
import { simulatorApi } from '../api/services'
import { useDashboardStore } from './dashboardStore'
import type { SimulatorParams, SimulatorResult } from '../types'

interface SimulatorState {
  params: SimulatorParams
  result: SimulatorResult | null
  loading: boolean
  error: string | null
  setParam: (key: keyof SimulatorParams, value: number) => void
  run: () => Promise<void>
}

const DEFAULT_PARAMS: SimulatorParams = {
  renewable_energy_pct: 0,
  fleet_ev_pct: 0,
  supplier_reduction_pct: 0,
  carbon_tax_rate: 0,
  production_volume_change_pct: 0,
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  result: null,
  loading: false,
  error: null,
  setParam: (key, value) =>
    set((s) => ({ params: { ...s.params, [key]: value } })),
  run: async () => {
    set({ loading: true, error: null })
    try {
      // Check if forecast exists before running simulation
      const forecast = useDashboardStore.getState().forecast
      if (!forecast) {
        set({ error: 'No forecast available. Run a forecast first.' })
        set({ loading: false })
        return
      }
      const result = await simulatorApi.run(get().params)
      set({ result })
    } catch {
      set({ error: 'Simulation failed. Ensure a valid forecast exists.' })
    } finally {
      set({ loading: false })
    }
  },
}))
