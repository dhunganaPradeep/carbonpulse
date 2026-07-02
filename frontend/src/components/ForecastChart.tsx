import {
  Area,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ForecastPoint } from '../types'

interface Row {
  forecast_date: string
  yhat: number
  band: [number, number]
}

export default function ForecastChart({ points }: { points: ForecastPoint[] }) {
  const rows: Row[] = points.map((p) => ({
    forecast_date: p.forecast_date,
    yhat: Number(p.yhat),
    band: [Number(p.yhat_lower), Number(p.yhat_upper)],
  }))

  return (
    <div className="w-full h-full">
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wider">
        Forecast Projection (tCO2e)
      </h3>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} vertical={false} />
          <XAxis dataKey="forecast_date" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px' }}
            itemStyle={{ color: '#e2e8f0' }}
          />
          <Legend />
          <Area
            type="monotone"
            dataKey="band"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.15}
            name="Confidence band"
          />
          <Line
            type="monotone"
            dataKey="yhat"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            name="Predicted"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
