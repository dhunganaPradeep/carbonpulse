interface Props {
  label: string
  value: string
  accent?: string
}

export default function StatCard({ label, value, accent = 'text-slate-900 dark:text-white' }: Props) {
  return (
    <div className="p-4 sm:p-5">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      <p className={`text-4xl font-bold mt-2 tracking-tight ${accent}`}>{value}</p>
    </div>
  )
}
