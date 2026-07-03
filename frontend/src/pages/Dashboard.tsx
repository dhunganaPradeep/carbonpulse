import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDashboardStore } from '../store/dashboardStore'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../lib/permissions'
import StatCard from '../components/StatCard'
import EmissionsChart from '../components/EmissionsChart'
import ScopeBreakdownChart from '../components/ScopeBreakdownChart'
import BreakdownBarChart from '../components/BreakdownBarChart'
import RegulatoryHealthCard from '../components/RegulatoryHealthCard'
import ForecastChart from '../components/ForecastChart'
import RoleBadge from '../components/RoleBadge'

const SCOPE_LABEL: Record<string, string> = {
  scope_1: 'Scope 1',
  scope_2: 'Scope 2',
  scope_3: 'Scope 3',
}

export default function Dashboard() {
  const {
    aggregation,
    timeseries,
    forecast,
    categoryBreakdown,
    supplierBreakdown,
    facilityBreakdown,
    energySourceBreakdown,
    regulatory,
    loading,
    error,
    loadDashboard,
    loadForecast,
  } = useDashboardStore()
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  useEffect(() => {
    void loadDashboard()
    // Empty dependency array - only run on mount
  }, [])



  const total = aggregation?.grand_total_co2e_tonnes ?? 0
  const scope3 = aggregation?.by_scope.find((s) => s.scope === 'scope_3')
  const scope3Pct = total > 0 && scope3 ? (scope3.total_co2e_tonnes / total) * 100 : 0

  return (
    <div className="space-y-8 animate-fade-in">

      {!caps.isAdmin && (
        <div className="text-slate-600 dark:text-slate-300 py-2 sm:py-4 flex gap-4 items-start">
          <div>
            <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-200">What is CarbonPulse?</h3>
            <p className="mt-1 text-sm leading-relaxed opacity-90">
              CarbonPulse is a carbon footprint intelligence platform. It tracks your Scope 1, 2 and 3 emissions, forecasts the next 12–36 months with a Prophet model, lets you simulate decarbonisation levers, and scores your exposure to regulations such as CSRD and the SEC climate rule.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Emissions Intelligence
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Real-time tracking, forecasting, and regulatory insights for your entire value chain.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
        </div>
      )}

      {/* Headlines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1">
          <StatCard
            label="Total Emissions (tCO2e)"
            value={total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            accent="text-emerald-600 dark:text-emerald-400"
          />
        </div>
        {aggregation?.by_scope.map((s) => (
          <div key={s.scope} className="lg:col-span-1">
            <StatCard
              label={SCOPE_LABEL[s.scope]}
              value={s.total_co2e_tonnes.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              accent="text-slate-900 dark:text-slate-100"
            />
          </div>
        ))}
        <div className="lg:col-span-1">
          <StatCard
            label="Scope 3 Share"
            value={`${scope3Pct.toFixed(0)}%`}
            accent="text-amber-500 dark:text-amber-400"
          />
        </div>
      </div>

      {/* Timeseries */}
      <div className="py-4">
        <EmissionsChart data={timeseries} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="py-2">
          <ScopeBreakdownChart data={aggregation?.by_scope ?? []} />
        </div>
        <div className="py-2">
          <BreakdownBarChart
            title="Emissions by category (tCO2e)"
            data={categoryBreakdown?.items ?? []}
            color="#3b82f6"
          />
        </div>
        <div className="py-2">
          <RegulatoryHealthCard data={regulatory} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="py-4">
          <BreakdownBarChart
            title="Emissions by facility (tCO2e)"
            data={facilityBreakdown?.items ?? []}
            color="#8b5cf6"
          />
        </div>
        <div className="py-4">
          <BreakdownBarChart
            title="Emissions by energy source (tCO2e)"
            data={energySourceBreakdown?.items ?? []}
            color="#14b8a6"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="py-4">
          <BreakdownBarChart
            title="Top suppliers by emissions (tCO2e)"
            data={supplierBreakdown?.items ?? []}
            color="#f59e0b"
          />
        </div>
        <div className="py-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Prophet Forecast
            </h3>
            {caps.canRunForecast && (
              <Link to="/forecast" className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300 font-medium">View Analysis &rarr;</Link>
            )}
          </div>
          <div className="flex-grow">
            {forecast?.points?.length ? (
              <ForecastChart points={forecast.points} />
            ) : (
              <div className="h-full min-h-[200px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700/50 border-dashed">
                <p className="text-sm text-slate-500 text-center px-4">
                  No forecasting models active.<br />
                  {caps.canRunForecast
                    ? 'Run predictive analysis from the Forecast module.'
                    : 'Awaiting predictive analysis from your data team.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
