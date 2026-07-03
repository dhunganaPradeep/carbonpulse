import { useEffect, useState } from 'react'
import { regulatoryApi } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../lib/permissions'
import RegulatoryHealthCard from '../components/RegulatoryHealthCard'
import { useSettingsStore } from '../store/settingsStore'
import type { RegulatoryScoreResponse } from '../types'

interface Profile {
  annual_revenue_eur: number
  employee_count: number
  is_eu_operating: boolean
  is_us_listed: boolean
  carbon_tax_rate: number
}

const DEFAULT_PROFILE: Profile = {
  annual_revenue_eur: 60_000_000,
  employee_count: 300,
  is_eu_operating: true,
  is_us_listed: true,
  carbon_tax_rate: 85,
}

export default function Regulatory() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE)
  const [result, setResult] = useState<RegulatoryScoreResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currencySymbol, exchangeRate } = useSettingsStore()
  // The backend expects values in EUR for threshold comparisons.
  // exchangeRate is relative to USD. EUR is 0.92.
  const eurToLocal = exchangeRate / 0.92

  const score = async () => {
    setLoading(true)
    setError(null)
    try {
      setResult(await regulatoryApi.score(profile as unknown as Record<string, unknown>))
    } catch {
      setError('Failed to compute regulatory score.')
    } finally {
      setLoading(false)
    }
  }

  // Load an initial score with the default profile.
  useEffect(() => {
    void score()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setNum = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => ({ ...p, [key]: Number(e.target.value) / (key === 'annual_revenue_eur' || key === 'carbon_tax_rate' ? eurToLocal : 1) }))
  const setBool = (key: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setProfile((p) => ({ ...p, [key]: e.target.checked }))

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Regulatory Exposure
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            Assess your compliance risk and potential financial exposure against major climate regulations like CSRD, SEC climate rules, and regional carbon taxes.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 lg:p-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Company Profile</h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Annual revenue
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    value={Math.round(profile.annual_revenue_eur * eurToLocal)}
                    onChange={setNum('annual_revenue_eur')}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Employee Headcount</label>
                <input
                  type="number"
                  value={profile.employee_count}
                  onChange={setNum('employee_count')}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Carbon tax rate (per tCO2e)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">{currencySymbol}</span>
                  <input
                    type="number"
                    value={Math.round(profile.carbon_tax_rate * eurToLocal)}
                    onChange={setNum('carbon_tax_rate')}
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                  />
                </div>
              </div>
              <div className="pt-2 space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={profile.is_eu_operating}
                    onChange={setBool('is_eu_operating')}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Operating in the EU</span>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={profile.is_us_listed}
                    onChange={setBool('is_us_listed')}
                    className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-300 rounded focus:ring-emerald-500 dark:focus:ring-emerald-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 accent-emerald-500"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">US-listed (Publicly Traded)</span>
                </label>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700/50">
              <button
                onClick={score}
                disabled={loading || !caps.canScoreRegulatory}
                title={caps.canScoreRegulatory ? undefined : 'Requires Analyst or Admin role'}
                className="w-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-semibold rounded-xl py-3 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-slate-900 border-t-transparent"></div>
                    <span>Scoring...</span>
                  </>
                ) : 'Compute Score'}
              </button>
              {!caps.canScoreRegulatory && (
                <p className="text-xs text-center text-slate-500 mt-3">
                  Viewers can see scores but cannot recompute them.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 lg:p-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Overall Exposure Score</h3>
            <RegulatoryHealthCard data={result} />
          </div>
          
          {result && (
            <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 lg:p-8">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                Detailed Framework Analysis
              </h3>
              <div className="grid gap-4">
                {result.frameworks.map((f) => (
                  <div key={f.framework} className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${
                          f.score >= 80 ? 'bg-emerald-500' :
                          f.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}></div>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{f.framework}</h4>
                      </div>
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <span className="text-sm text-slate-500 dark:text-slate-400">Score:</span>
                        <span className={`text-lg font-bold ${
                          f.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                          f.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>{f.score.toFixed(0)}<span className="text-xs text-slate-400 font-normal">/100</span></span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 ml-5 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      {f.rationale}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
