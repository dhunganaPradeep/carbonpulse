import { useCallback, useEffect, useState } from 'react'
import { AxiosError } from 'axios'
import { emissionsApi } from '../api/services'
import { useAuthStore } from '../store/authStore'
import { capabilitiesForUser } from '../lib/permissions'
import type { EmissionInput, EmissionRecord, EmissionScope } from '../types'

const SCOPES: EmissionScope[] = ['scope_1', 'scope_2', 'scope_3']
const SCOPE_LABEL: Record<EmissionScope, string> = {
  scope_1: 'Scope 1',
  scope_2: 'Scope 2',
  scope_3: 'Scope 3',
}
const PAGE_SIZE = 25

const EMPTY_FORM: EmissionInput = {
  recorded_on: new Date().toISOString().slice(0, 10),
  scope: 'scope_1',
  co2e_tonnes: 0,
  category: '',
  facility: '',
  energy_source: '',
  source: 'manual',
}

export default function Emissions() {
  const user = useAuthStore((s) => s.user)
  const caps = capabilitiesForUser(user)

  const [records, setRecords] = useState<EmissionRecord[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [scopeFilter, setScopeFilter] = useState<EmissionScope | ''>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<EmissionInput>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const page = await emissionsApi.list({
        scope: scopeFilter || undefined,
        limit: PAGE_SIZE,
        offset,
      })
      setRecords(page.items)
      setTotal(page.total)
    } catch {
      setError('Failed to load emission records.')
    } finally {
      setLoading(false)
    }
  }, [scopeFilter, offset])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const startEdit = (r: EmissionRecord) => {
    setEditingId(r.id)
    setForm({
      recorded_on: r.recorded_on,
      scope: r.scope,
      co2e_tonnes: r.co2e_tonnes,
      category: r.category ?? '',
      facility: r.facility ?? '',
      energy_source: r.energy_source ?? '',
      source: r.source ?? '',
    })
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      if (editingId) {
        await emissionsApi.update(editingId, form)
      } else {
        await emissionsApi.create(form)
      }
      resetForm()
      await load()
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      setError(
        axiosErr.response?.status === 403
          ? 'You do not have permission to modify emissions.'
          : axiosErr.response?.data?.detail ?? 'Failed to save record.',
      )
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    setError(null)
    try {
      await emissionsApi.remove(id)
      if (editingId === id) resetForm()
      await load()
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>
      setError(
        axiosErr.response?.status === 403
          ? 'You do not have permission to delete emissions.'
          : 'Failed to delete record.',
      )
    }
  }

  const setField = <K extends keyof EmissionInput>(key: K, value: EmissionInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const page = Math.floor(offset / PAGE_SIZE) + 1
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Emissions Registry
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            {caps.canEditEmissions
              ? 'Browse, add, edit and delete individual Scope 1, 2, and 3 emission records. Changes immediately feed the dashboard aggregations and future forecasts.'
              : 'Browse your organisation\u2019s Scope 1/2/3 emission records. Adding, editing and deleting records is reserved for Analysts and Admins.'}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
          <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        </div>
      )}

      {caps.canEditEmissions && (
        <form
          onSubmit={onSubmit}
          className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Date</label>
            <input
              type="date"
              required
              value={form.recorded_on}
              onChange={(e) => setField('recorded_on', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Scope</label>
            <select
              value={form.scope}
              onChange={(e) => setField('scope', e.target.value as EmissionScope)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">tCO2e</label>
            <input
              type="number"
              required
              min={0.0001}
              step="0.0001"
              value={form.co2e_tonnes}
              onChange={(e) => setField('co2e_tonnes', Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Category</label>
            <input
              required
              value={form.category ?? ''}
              onChange={(e) => setField('category', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Facility</label>
            <input
              required
              value={form.facility ?? ''}
              onChange={(e) => setField('facility', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">Energy Source</label>
            <input
              required
              value={form.energy_source ?? ''}
              onChange={(e) => setField('energy_source', e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-900 rounded-xl px-3 py-2 text-sm font-semibold shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
            >
              {editingId ? 'Update' : 'Add Record'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-sm dark:shadow-xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <label className="font-medium text-slate-700 dark:text-slate-300">Filter Scope</label>
            <select
              value={scopeFilter}
              onChange={(e) => {
                setOffset(0)
                setScopeFilter(e.target.value as EmissionScope | '')
              }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">All Scopes</option>
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            {total.toLocaleString()} total records
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/50">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/40">
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-3 pl-4 pr-3 font-medium">Date</th>
                <th className="py-3 pr-3 font-medium">Scope</th>
                <th className="py-3 pr-3 text-right font-medium">tCO2e</th>
                <th className="py-3 pr-3 font-medium">Category</th>
                <th className="py-3 pr-3 font-medium">Facility</th>
                <th className="py-3 pr-3 font-medium">Energy Source</th>
                {caps.canEditEmissions && <th className="py-3 pr-4 font-medium text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 pl-4 pr-3 whitespace-nowrap text-slate-900 dark:text-slate-200">{r.recorded_on}</td>
                  <td className="py-3 pr-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {SCOPE_LABEL[r.scope]}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                    {r.co2e_tonnes.toLocaleString(undefined, {
                      maximumFractionDigits: 4,
                    })}
                  </td>
                  <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{r.category ?? '\u2014'}</td>
                  <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">{r.facility ?? '\u2014'}</td>
                  <td className="py-3 pr-3 text-slate-600 dark:text-slate-400 truncate max-w-[120px]">
                    {r.energy_source ?? '\u2014'}
                  </td>
                  {caps.canEditEmissions && (
                    <td className="py-3 pr-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => startEdit(r)}
                        className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium mr-3 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void onDelete(r.id)}
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && records.length === 0 && (
                <tr>
                  <td
                    colSpan={caps.canEditEmissions ? 7 : 6}
                    className="py-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    No emission records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Page {page} of {pageCount}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={offset + PAGE_SIZE >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-4 py-2 font-medium text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
