import { useEffect } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  ComposedChart
} from 'recharts'
import { useSimulatorStore } from '../store/simulatorStore'
import { useDashboardStore } from '../store/dashboardStore'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore } from '../store/settingsStore'
import { capabilitiesForUser } from '../lib/permissions'
import type { SimulatorParams } from '../types'
import StatCard from '../components/StatCard'

const SLIDERS: {
  key: keyof SimulatorParams
  label: string
  description: string
  min: number
  max: number
  step: number
  unit: string
}[] = [
  { key: 'renewable_energy_pct', label: 'Renewable energy', description: 'Switch to green energy sources', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'fleet_ev_pct', label: 'Fleet electrification', description: 'Transition vehicles to EV', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'supplier_reduction_pct', label: 'Supplier reduction', description: 'Supply chain optimization', min: 0, max: 100, step: 1, unit: '%' },
  { key: 'production_volume_change_pct', label: 'Production volume change', description: 'Projected output growth', min: -100, max: 200, step: 1, unit: '%' },
  { key: 'carbon_tax_rate', label: 'Carbon tax rate', description: 'Simulated pricing model', min: 0, max: 500, step: 5, unit: '/t' },
]

export default function Simulator() {
  const { params, result, loading, error, setParam, run } = useSimulatorStore()
  const forecast = useDashboardStore((s) => s.forecast)
  const user = useAuthStore((s) => s.user)
  const { currencySymbol, exchangeRate } = useSettingsStore()
  const caps = capabilitiesForUser(user)

  // Only auto-run if forecast exists
  useEffect(() => {
    if (!forecast) return
    const t = setTimeout(() => void run(), 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, forecast])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Decarbonisation Simulator
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            {caps.canRunSimulator
              ? 'Adjust the levers below to see how renewable energy transitions, fleet electrification, supplier reductions, production volume and carbon tax pricing reshape your forecast emissions and tax exposure. Results update dynamically based on your baseline Prophet forecast.'
              : 'Explore how decarbonisation levers reshape forecast emissions and carbon tax exposure. You have read-only access and can move the sliders to view projections.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      {!forecast && !error && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">No forecast available. Go to the <a href="/forecast" className="underline font-semibold hover:text-amber-700 dark:hover:text-amber-300">Forecast</a> page to run a baseline prediction first.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Simulation Levers</h3>
            <div className="space-y-8">
              {SLIDERS.map((s) => (
                <div key={s.key} className="relative">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <span className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{s.label}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400">{s.description}</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 rounded-lg text-sm">
                      {s.key === 'carbon_tax_rate' ? currencySymbol : ''}
                      {s.key === 'carbon_tax_rate' ? Math.round(params[s.key] * exchangeRate) : params[s.key]}
                      {s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.key === 'carbon_tax_rate' ? s.min * exchangeRate : s.min}
                    max={s.key === 'carbon_tax_rate' ? s.max * exchangeRate : s.max}
                    step={s.key === 'carbon_tax_rate' ? Math.max(1, Math.round(s.step * exchangeRate)) : s.step}
                    value={s.key === 'carbon_tax_rate' ? params[s.key] * exchangeRate : params[s.key]}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      setParam(s.key, s.key === 'carbon_tax_rate' ? val / exchangeRate : val)
                    }}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
              <button onClick={() => {
                setParam('renewable_energy_pct', 0)
                setParam('fleet_ev_pct', 0)
                setParam('supplier_reduction_pct', 0)
                setParam('production_volume_change_pct', 0)
                setParam('carbon_tax_rate', 0)
              }} className="w-full py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Reset to Baseline
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <StatCard
              label="Projected Reduction"
              value={`${result?.reduction_pct ?? 0}%`}
              accent="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Simulated Total (tCO2e)"
              value={(result?.simulated_total ?? 0).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              accent="text-indigo-600 dark:text-indigo-400"
            />
            <StatCard
              label="Est. Carbon Tax"
              value={`${currencySymbol}${((result?.estimated_carbon_tax ?? 0) * exchangeRate).toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}`}
              accent="text-rose-600 dark:text-rose-400"
            />
          </div>
          
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Trajectory Comparison
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Baseline vs Simulated Emissions {loading && <span className="animate-pulse text-emerald-500">(recalculating...)</span>}</p>
              </div>
            </div>
            
            {result?.points && result.points.length > 0 ? (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={result.points} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorSimulated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                    <XAxis dataKey="forecast_date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Area type="monotone" dataKey="baseline" name="Baseline Trajectory" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" />
                    <Line type="monotone" dataKey="simulated" name="Simulated Outcome" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 border-dashed">
                <p className="text-sm text-slate-500 text-center px-4">
                  No simulation data available.<br/>
                  Ensure a baseline Prophet forecast exists first.
                </p>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
              <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2">How to read this simulation</h4>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                The grey area represents your <strong>Baseline Trajectory</strong> — the original Prophet ML forecast without any interventions. The green line shows your <strong>Simulated Outcome</strong>, representing how your emissions curve will change if you successfully implement the selected decarbonisation levers on the left.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
