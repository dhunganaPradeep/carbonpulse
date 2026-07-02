import type { ReactNode } from 'react'

interface Props {
  title: string
  description: string
  tone?: 'info' | 'neutral' | 'warning'
  children?: ReactNode
}

const TONE_STYLES: Record<NonNullable<Props['tone']>, string> = {
  info: 'border-sky-200 bg-sky-50',
  neutral: 'border-gray-200 bg-white',
  warning: 'border-amber-200 bg-amber-50',
}

/**
 * Descriptive context panel. Used to explain what a page shows and what the
 * current user can (or cannot) do on it, based on their role.
 */
export default function InfoCard({
  title,
  description,
  tone = 'info',
  children,
}: Props) {
  return (
    <div className={`rounded-xl border p-4 ${TONE_STYLES[tone]}`}>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      {children}
    </div>
  )
}
