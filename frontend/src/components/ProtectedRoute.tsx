import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { UserRole } from '../types'

interface Props {
  children: ReactNode
  /** When set, the authenticated user must have one of these roles. */
  roles?: UserRole[]
}

export default function ProtectedRoute({ children, roles }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  // Role gate: if roles are required, wait for the user to load, then check.
  if (roles && user && !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}
