import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { TimeBucket } from '../types'

const SCOPE_COLORS: Record<string, string> = {
  scope_1: '#16a34a',
  scope_2: '#0ea5e9',
  scope_3: '#f59e0b',
}

interface Row {
  period: string
  scope_1: number
  scope_2: number
  scope_3: number
}

function pivot(data: TimeBucket[]): Row[] {
  const map = new Map<string, Row>()
  for (const b of data) {
    const key = b.period
    const row =
      map.get(key) ?? { period: key, scope_1: 0, scope_2: 0, scope_3: 0 }
    row[b.scope] = Number(b.total_co2e_tonnes)
    map.set(key, row)
  }
  return Array.from(map.values()).sort((a, b) =>
    a.period.localeCompare(b.period),
  )
}

export default function EmissionsChart({ data }: { data: TimeBucket[] }) {
  const rows = pivot(data)
  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
        Emissions over time (tCO2e)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
          <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          {(['scope_1', 'scope_2', 'scope_3'] as const).map((s) => (
            <Area
              key={s}
              type="monotone"
              dataKey={s}
              stackId="1"
              stroke={SCOPE_COLORS[s]}
              fill={SCOPE_COLORS[s]}
              fillOpacity={0.8}
              isAnimationActive
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
