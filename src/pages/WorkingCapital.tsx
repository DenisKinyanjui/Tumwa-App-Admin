import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, Link } from 'react-router-dom'
import { Pencil, Check, X } from 'lucide-react'
import { fetchUsers, setRunnerWorkingCapital } from '../services/api'
import type { AdminUser } from '../types'
import type { LayoutOutletContext } from '../layouts/AdminLayout'

function fmtCurrency(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const LIMIT = 20

// Runner risk/trust ceiling used by the matching engine — not a wallet
// balance. See services/workingCapitalService.js in the backend.
export default function WorkingCapital() {
  const navigate = useNavigate()
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const [runners, setRunners] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Inline "edit limit" state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null)

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((p: number, q: string) => {
    setLoading(true)
    setError('')
    fetchUsers({
      page: p,
      limit: LIMIT,
      role: 'runner',
      search: q || undefined,
      sortBy: 'workingCapital.limit',
      order: 'desc',
    })
      .then((res) => {
        setRunners(res.data.users)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(page, search) }, [page, load]) // search handled via debounce below

  useEffect(() => {
    // Kept short since this renders in the layout's single-line header
    // breadcrumb slot — the full explanation still lives in the page body.
    setSubtitle(
      <>
        Risk/trust limits, not withdrawable — progression rules on{' '}
        <Link to="/settings" className="font-semibold text-primary-600 hover:underline">Settings</Link>
      </>,
    )
  }, [setSubtitle])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setPage(1)
      load(1, value)
    }, 350)
  }

  const startEdit = (runner: AdminUser, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(runner._id)
    setEditValue(String(runner.workingCapital?.limit ?? 0))
    setRowError(null)
  }

  const cancelEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingId(null)
    setEditValue('')
  }

  const saveEdit = async (runnerId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const numValue = Number(editValue)
    if (editValue === '' || isNaN(numValue) || numValue < 0) {
      setRowError({ id: runnerId, message: 'Enter a non-negative number.' })
      return
    }

    setSavingId(runnerId)
    setRowError(null)
    try {
      const updated = await setRunnerWorkingCapital(runnerId, numValue)
      setRunners((prev) => prev.map((r) => (r._id === runnerId ? updated : r)))
      setEditingId(null)
    } catch (err) {
      setRowError({ id: runnerId, message: err instanceof Error ? err.message : 'Failed to update limit.' })
    } finally {
      setSavingId(null)
    }
  }

  const totalLimit = runners.reduce((sum, r) => sum + (r.workingCapital?.limit ?? 0), 0)
  const totalUsed = runners.reduce((sum, r) => sum + (r.workingCapital?.used ?? 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Limit (this page)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtCurrency(totalLimit)}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total Active (this page)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{fmtCurrency(totalUsed)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3 border-b border-gray-100 p-4">
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full max-w-xs rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-400"
          />
        </div>

        {error && <div className="p-4 text-sm text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Runner</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Limit</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Active</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Available</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Level</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">Loading…</td></tr>
              ) : runners.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-400">No runners found</td></tr>
              ) : (
                runners.map((runner) => {
                  const limit = runner.workingCapital?.limit ?? 0
                  const used = runner.workingCapital?.used ?? 0
                  const available = Math.max(0, limit - used)
                  const isEditing = editingId === runner._id
                  return (
                    <tr
                      key={runner._id}
                      onClick={() => !isEditing && navigate(`/users/${runner._id}`)}
                      className="cursor-pointer border-b border-gray-50 transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{runner.name}</p>
                        <p className="text-xs text-gray-400">{runner.phone}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">
                        {isEditing ? (
                          <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-sm outline-none focus:border-primary-400"
                            />
                            <button
                              onClick={(e) => saveEdit(runner._id, e)}
                              disabled={savingId === runner._id}
                              className="rounded-md bg-green-50 p-1.5 text-green-700 hover:bg-green-100 disabled:opacity-50"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={savingId === runner._id}
                              className="rounded-md bg-gray-50 p-1.5 text-gray-500 hover:bg-gray-100"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span>{fmtCurrency(limit)}</span>
                            <button
                              onClick={(e) => startEdit(runner, e)}
                              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              title="Edit limit"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {rowError?.id === runner._id && (
                          <p className="mt-1 text-xs text-red-600">{rowError.message}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-700">{fmtCurrency(used)}</td>
                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">{fmtCurrency(available)}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{runner.level}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 p-4">
            <p className="text-xs text-gray-400">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} runners
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
