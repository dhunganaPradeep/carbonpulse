import type { RegulatoryScoreResponse } from '../types'

function riskTone(score: number): { label: string; color: string } {
  if (score >= 70) return { label: 'High exposure', color: 'text-rose-600 dark:text-rose-400' }
  if (score >= 40) return { label: 'Moderate exposure', color: 'text-amber-600 dark:text-amber-400' }
  return { label: 'Low exposure', color: 'text-emerald-600 dark:text-emerald-400' }
}

export default function RegulatoryHealthCard({
  data,
}: {
  data: RegulatoryScoreResponse | null
}) {
  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
        Regulatory Health Score
      </h3>
      {!data ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No regulatory score yet.</p>
      ) : (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              {data.overall_risk_score.toFixed(0)}
              <span className="text-xl font-medium text-slate-400 dark:text-slate-500 tracking-normal ml-1">/100</span>
            </p>
            <p className={`text-sm font-bold mt-2 uppercase tracking-widest ${riskTone(data.overall_risk_score).color}`}>
              {riskTone(data.overall_risk_score).label}
            </p>
          </div>
          <ul className="space-y-3">
            {data.frameworks.map((f) => (
              <li
                key={f.framework}
                className="flex items-center justify-between text-sm p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/30"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">{f.framework}</span>
                <span className={`font-bold ${riskTone(f.score).color}`}>
                  {f.score.toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
