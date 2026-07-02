import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DimensionTotal } from '../types'

interface Props {
  title: string
  data: DimensionTotal[]
  color?: string
  /** Limit to the top N entries by total (default 8). */
  limit?: number
  /** Optional map to prettify raw keys (e.g. enum values). */
  labelMap?: Record<string, string>
}

function prettify(key: string): string {
  return key
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export default function BreakdownBarChart({
  title,
  data,
  color = '#16a34a',
  limit = 8,
  labelMap,
}: Props) {
  const rows = [...data]
    .sort((a, b) => b.total_co2e_tonnes - a.total_co2e_tonnes)
    .slice(0, limit)
    .map((d) => ({
      name: labelMap?.[d.key] ?? prettify(d.key),
      value: Number(d.total_co2e_tonnes),
    }))

  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No data available.</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#64748b' }}
              width={120}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
              itemStyle={{ color: '#e2e8f0' }}
              formatter={(v: number) =>
                v.toLocaleString(undefined, { maximumFractionDigits: 0 })
              }
            />
            <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
