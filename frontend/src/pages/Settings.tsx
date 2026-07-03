import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { adminApi } from '../api/services'
import { useAuthStore } from '../store/authStore'
import RoleBadge from '../components/RoleBadge'
import type { AdminUser, AuditEntry, Organisation, UserRole } from '../types'

const ROLES: UserRole[] = ['ADMIN', 'ANALYST', 'VIEWER']

export default function Settings() {
  const currentUser = useAuthStore((s) => s.user)
  const [org, setOrg] = useState<Organisation | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // Edit org state
  const [editOrg, setEditOrg] = useState({ name: '', industry: '', country: '' })
  const [savingOrg, setSavingOrg] = useState(false)
  const [orgSuccess, setOrgSuccess] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [orgData, userData, auditData] = await Promise.all([
        adminApi.org(),
        adminApi.users(),
        adminApi.audit(50),
      ])
      setOrg(orgData)
      setEditOrg({
        name: orgData.name,
        industry: orgData.industry || '',
        country: orgData.country || '',
      })
      setUsers(userData)
      setAudit(auditData)
    } catch {
      setError('Failed to load admin settings.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const mutateUser = async (id: string, payload: { role?: UserRole; is_active?: boolean }) => {
    setSavingId(id)
    setError(null)
    try {
      const updated = await adminApi.updateUser(id, payload)
      setUsers((list) => list.map((u) => (u.id === id ? updated : u)))
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      setError(axiosErr.response?.data?.detail ?? 'Failed to update user.')
    } finally {
      setSavingId(null)
    }
  }

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingOrg(true)
    setError(null)
    setOrgSuccess(false)
    try {
      const updated = await adminApi.updateOrg(editOrg)
      setOrg(updated)
      setOrgSuccess(true)
      setTimeout(() => setOrgSuccess(false), 3000)
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      setError(axiosErr.response?.data?.detail ?? 'Failed to update organisation.')
    } finally {
      setSavingOrg(false)
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Organisation Settings
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your profile, team access, and view audit logs.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 dark:border-emerald-400"></div>
        </div>
      )}

      {org && !loading && (
        <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 lg:p-8 shadow-sm dark:shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Organisation Profile</h3>
            {orgSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">Changes saved!</span>}
          </div>

          <form onSubmit={handleUpdateOrg} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Organisation Name</label>
              <input
                type="text"
                value={editOrg.name}
                onChange={(e) => setEditOrg({ ...editOrg, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Slug (Read-only)</label>
              <input
                type="text"
                value={org.slug}
                disabled
                className="w-full bg-slate-100 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Industry</label>
              <input
                type="text"
                value={editOrg.industry}
                onChange={(e) => setEditOrg({ ...editOrg, industry: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Country Code</label>
              <input
                type="text"
                maxLength={2}
                value={editOrg.country}
                onChange={(e) => setEditOrg({ ...editOrg, country: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
            <div className="md:col-span-2 pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingOrg}
                className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
              >
                {savingOrg ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden">
        <div className="p-6 lg:p-8 border-b border-slate-200 dark:border-slate-700/50">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team Members</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage who has access to your organisation's data.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-4 pl-6 pr-4 font-medium">User</th>
                <th className="py-4 pr-4 font-medium">Role</th>
                <th className="py-4 pr-4 font-medium">Status</th>
                <th className="py-4 pr-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {users.map((u) => {
                const isSelf = u.id === currentUser?.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-4 pl-6 pr-4">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {u.full_name ?? u.email}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{u.email}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <select
                        value={u.role}
                        disabled={savingId === u.id}
                        onChange={(e) =>
                          void mutateUser(u.id, { role: e.target.value as UserRole })
                        }
                        className="bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-slate-500 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500"></span>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 pr-6 text-right">
                      <button
                        disabled={savingId === u.id || isSelf}
                        title={isSelf ? 'You cannot deactivate your own account' : undefined}
                        onClick={() => void mutateUser(u.id, { is_active: !u.is_active })}
                        className={`text-sm font-medium transition-colors ${isSelf ? 'text-slate-400 dark:text-slate-600 cursor-not-allowed' :
                          u.is_active ? 'text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300' : 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300'
                          }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 lg:p-8 shadow-sm dark:shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Audit Log</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Recent activity within your organisation.</p>
          </div>
        </div>
        {audit.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-500 text-sm">No activity recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {audit.map((a) => (
              <div key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/30">
                <div>
                  <div className="text-slate-900 dark:text-slate-200 font-medium text-sm">
                    {a.action}
                    {a.entity && <span className="text-emerald-700 dark:text-emerald-400 ml-1.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-400/10 text-xs">{a.entity}</span>}
                  </div>
                  {a.detail && <div className="text-slate-500 dark:text-slate-400 text-xs mt-1">{a.detail}</div>}
                </div>
                <div className="text-slate-500 text-xs font-mono">
                  {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
