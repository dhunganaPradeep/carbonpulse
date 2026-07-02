import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ScopeTotal } from '../types'

const SCOPE_LABEL: Record<string, string> = {
  scope_1: 'Scope 1',
  scope_2: 'Scope 2',
  scope_3: 'Scope 3',
}

const SCOPE_COLORS: Record<string, string> = {
  scope_1: '#16a34a',
  scope_2: '#0ea5e9',
  scope_3: '#f59e0b',
}

export default function ScopeBreakdownChart({
  data,
}: {
  data: ScopeTotal[]
}) {
  const rows = data.map((s) => ({
    name: SCOPE_LABEL[s.scope] ?? s.scope,
    scope: s.scope,
    value: Number(s.total_co2e_tonnes),
  }))

  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
        Scope breakdown (tCO2e)
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={rows}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={60}
            paddingAngle={4}
            stroke="none"
          >
            {rows.map((r) => (
              <Cell key={r.scope} fill={SCOPE_COLORS[r.scope] ?? '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
            itemStyle={{ color: '#e2e8f0' }}
            formatter={(v: number) =>
              v.toLocaleString(undefined, { maximumFractionDigits: 0 })
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
