import { useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { forecastApi } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { useDashboardStore } from '../store/dashboardStore'
import { capabilitiesForUser } from '../lib/permissions'
import ForecastChart from '../components/ForecastChart'
import type { ForecastRun } from '../types'

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 20
const HORIZONS = [6, 12, 18, 24, 36]

function parseMetrics(raw: string | null): { label: string; value: string }[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const out: { label: string; value: string }[] = []
    if (typeof parsed.mape === 'number') {
      out.push({ label: 'MAPE', value: `${(parsed.mape * 100).toFixed(1)}%` })
    }
    if (typeof parsed.rmse === 'number') {
      out.push({ label: 'RMSE', value: parsed.rmse.toFixed(1) })
    }
    if (typeof parsed.note === 'string' && out.length === 0) {
      out.push({ label: 'Note', value: parsed.note })
    }
    return out
  } catch {
    return []
  }
}

export default function Forecast() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const forecast = useDashboardStore((s) => s.forecast)
  const setForecast = useDashboardStore((s) => s.setForecast)

  const [horizon, setHorizon] = useState(12)
  const [status, setStatus] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const latest = await forecastApi.latest()
        setForecast(latest)
        setStatus('')
      } catch {
        setStatus('No completed forecast yet. Trigger one to begin.')
      }
    }
    void load()
  }, [])

  const onTrigger = async () => {
    setTriggering(true)
    setError(null)
    setStatus('Starting forecast run…')
    let created: ForecastRun
    try {
      created = await forecastApi.trigger(horizon)
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      if (axiosErr.response?.status === 403) {
        setError('You do not have permission to run a forecast.')
      } else {
        setError(
          axiosErr.response?.data?.detail ?? 'Failed to start forecast run.',
        )
      }
      setStatus('')
      setTriggering(false)
      return
    }

    setStatus('Forecast running… this may take a moment.')
    // We keep triggering=true until the WebSocket receives the update,
    // which will update the global `forecast` object and trigger our useEffect below.
  }

  // Clear triggering status when a new forecast arrives globally via WebSocket
  useEffect(() => {
    if (triggering && forecast?.status === 'completed') {
      setStatus('')
      setTriggering(false)
    }
  }, [forecast, triggering])

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            ML Forecast
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            {caps.canRunForecast
              ? 'Projects the next 12–36 months of total emissions (tCO2e) with an 80% confidence band, fitted on historical monthly data.'
              : 'Projects the next 12–36 months of total emissions (tCO2e) with an 80% confidence band. You have read-only access; an Analyst or Admin can trigger new runs.'}
          </p>
        </div>
        {caps.canRunForecast && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-white dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600 dark:text-slate-300 ml-1">Horizon:</label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                disabled={triggering}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
              >
                {HORIZONS.map((h) => (
                  <option key={h} value={h}>{h} months</option>
                ))}
              </select>
            </div>
            <button
              onClick={onTrigger}
              disabled={triggering}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 whitespace-nowrap"
            >
              {triggering ? 'Running…' : 'Run Forecast'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}
      {status && (
        <div className="bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{status}</p>
        </div>
      )}

      {forecast && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-wrap gap-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800/50 shadow-sm dark:shadow-xl border border-slate-200 dark:border-slate-700/50 px-5 py-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horizon</p>
            <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
              {forecast.horizon_months} months
            </p>
          </div>
          {parseMetrics(forecast.metrics).map((m) => (
            <div key={m.label} className="rounded-2xl bg-white dark:bg-slate-800/50 shadow-sm dark:shadow-xl border border-slate-200 dark:border-slate-700/50 px-5 py-4">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{m.label}</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {forecast?.points?.length ? (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 lg:p-8">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Prophet Projections</h3>
          <ForecastChart points={forecast.points} />
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white mb-2">How to read this forecast</h4>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              The graph above shows the projected emissions for your organization. The solid green line represents the median prediction generated by the Prophet machine learning model based on your historical data. The shaded green area represents the 80% confidence interval meaning there's an 80% probability that actual future emissions will fall within this range.
            </p>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 mt-3">
              <strong>MAPE (Mean Absolute Percentage Error):</strong> A measure of prediction accuracy. Lower is better. A MAPE of 5% means the forecast is off by 5% on average.<br />
              <strong>RMSE (Root Mean Square Error):</strong> Measures the average magnitude of the errors. Lower is better.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
