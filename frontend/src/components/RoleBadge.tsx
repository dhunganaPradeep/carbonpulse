import type { UserRole } from '../types'

const ROLE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  ANALYST: 'bg-indigo-500/10 text-indigo-400 ring-indigo-500/20',
  VIEWER: 'bg-slate-500/10 text-slate-400 ring-slate-500/20',
}

const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Admin',
  ANALYST: 'Analyst',
  VIEWER: 'Viewer',
}

/**
 * Small pill that visualises the current user's role. Used in the layout
 * header and on role-aware pages so the active capability set is always clear.
 */
export default function RoleBadge({ role }: { role: UserRole | null | undefined }) {
  if (!role) return null
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${ROLE_STYLES[role]}`}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}
