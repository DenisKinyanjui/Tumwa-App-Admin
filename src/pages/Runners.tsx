import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchUsers, updateUserStatus, deleteUser } from '../services/api'
import type { AdminUser } from '../types'

// ── Online badge ──────────────────────────────────────────────────────────────

type AvailabilityStatus = 'offline' | 'available' | 'busy' | 'receiving_request' | undefined

function OnlineBadge({ status }: { status: AvailabilityStatus }) {
  if (status === 'available' || status === 'receiving_request') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
        Online
      </span>
    )
  }
  if (status === 'busy') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Busy
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
      <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
      Offline
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
      isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
      {isActive ? 'Active' : 'Suspended'}
    </span>
  )
}

// ── Verification badge ─────────────────────────────────────────────────────────

const VERIFICATION_STYLES: Record<string, string> = {
  none:     'bg-gray-100 text-gray-500',
  pending:  'bg-yellow-50 text-yellow-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

function VerificationBadge({ status }: { status?: string }) {
  const s = status ?? 'none'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${VERIFICATION_STYLES[s] ?? VERIFICATION_STYLES.none}`}>
      {s === 'none' ? 'Not submitted' : s}
    </span>
  )
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  user: AdminUser
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function ConfirmModal({ user, onConfirm, onCancel, loading }: ConfirmModalProps) {
  const action = user.isActive ? 'Suspend' : 'Activate'
  const actionColor = user.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${user.isActive ? 'bg-red-50' : 'bg-green-50'}`}>
          {user.isActive ? (
            <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          ) : (
            <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>
        <h3 className="text-base font-bold text-gray-900">{action} Runner?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Are you sure you want to {action.toLowerCase()} <span className="font-semibold text-gray-700">{user.name}</span>?
          {user.isActive && ' They will lose access to the platform immediately.'}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${actionColor}`}
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {action}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

interface DeleteModalProps {
  user: AdminUser
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}

function DeleteConfirmModal({ user, onConfirm, onCancel, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900">Delete Runner?</h3>
        <p className="mt-1 text-sm text-gray-500">
          This will permanently delete{' '}
          <span className="font-semibold text-gray-700">{user.name}</span> and all their
          associated data, including errands, payments, disputes, and ratings.
        </p>
        <p className="mt-2 text-xs font-semibold text-red-500">This action cannot be undone.</p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Runners ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All',       value: '' as const },
  { label: 'Active',    value: true  as const },
  { label: 'Suspended', value: false as const },
] as const

const SORT_OPTIONS = [
  { label: 'Newest',         sortBy: 'createdAt'        as const, order: 'desc' as const },
  { label: 'Most Completed', sortBy: 'completedErrands'  as const, order: 'desc' as const },
  { label: 'Highest Rated',  sortBy: 'rating'            as const, order: 'desc' as const },
]

const LIMIT = 20

export default function Runners() {
  const navigate = useNavigate()
  const [runners, setRunners] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Filters
  const [search, setSearch]   = useState('')
  const [status, setStatus]   = useState<boolean | ''>('')
  const [sortIndex, setSortIndex] = useState(0)
  const [page, setPage]       = useState(1)

  // Toggle action
  const [confirmTarget, setConfirmTarget] = useState<AdminUser | null>(null)
  const [toggleLoading, setToggleLoading] = useState(false)
  const [toggleError, setToggleError]     = useState('')

  // Delete action
  const [deleteTarget, setDeleteTarget]   = useState<AdminUser | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState('')

  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback((p: number, q: string, s: boolean | '', sortIdx: number) => {
    setLoading(true)
    setError('')
    const sort = SORT_OPTIONS[sortIdx]
    fetchUsers({
      page: p,
      limit: LIMIT,
      role: 'runner',
      isActive: s,
      search: q || undefined,
      sortBy: sort.sortBy,
      order: sort.order,
    })
      .then((res) => {
        setRunners(res.data.users)
        setPagination({
          total: res.pagination.total,
          page: res.pagination.page,
          totalPages: res.pagination.totalPages,
        })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load(page, search, status, sortIndex)
  }, [page, status, sortIndex, load]) // search handled via debounce below

  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setPage(1)
      load(1, val, status, sortIndex)
    }, 350)
  }

  const handleStatusChange = (s: boolean | '') => {
    setStatus(s)
    setPage(1)
  }

  const handleSortChange = (idx: number) => {
    setSortIndex(idx)
    setPage(1)
  }

  const handleToggleConfirm = async () => {
    if (!confirmTarget) return
    setToggleLoading(true)
    setToggleError('')
    try {
      const updated = await updateUserStatus(confirmTarget._id, !confirmTarget.isActive)
      setRunners((prev) => prev.map((u) => (u._id === updated._id ? updated : u)))
      setConfirmTarget(null)
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : 'Failed to update runner.')
    } finally {
      setToggleLoading(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteUser(deleteTarget._id)
      setRunners((prev) => prev.filter((u) => u._id !== deleteTarget._id))
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete runner.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Runners</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {pagination.total > 0 ? `${pagination.total} total runners` : 'Manage platform runners'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {/* Sort */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {SORT_OPTIONS.map((opt, idx) => (
            <button
              key={opt.label}
              onClick={() => handleSortChange(idx)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                sortIndex === idx ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {STATUS_OPTIONS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleStatusChange(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button
            onClick={() => load(page, search, status, sortIndex)}
            className="ml-auto text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Delete error toast */}
      {deleteError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {deleteError}
          <button onClick={() => setDeleteError('')} className="ml-auto text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      {/* Toggle error toast */}
      {toggleError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {toggleError}
          <button onClick={() => setToggleError('')} className="ml-auto text-xs font-semibold underline">Dismiss</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Runner</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Online</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Rating</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Errands</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Verification</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Joined</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : runners.length === 0
                ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <p className="text-sm font-medium">No runners found</p>
                          <p className="text-xs">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                : runners.map((runner) => (
                    <tr key={runner._id} className="transition-colors hover:bg-gray-50/50">
                      {/* Runner */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                            {runner.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{runner.name}</p>
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-600">{runner.phone}</span>
                      </td>

                      {/* Online */}
                      <td className="px-5 py-4">
                        <OnlineBadge status={runner.availability?.status} />
                      </td>

                      {/* Rating */}
                      <td className="px-5 py-4">
                        {runner.rating > 0 ? (
                          <div className="flex items-center gap-1">
                            <svg className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-sm text-gray-700">{runner.rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      {/* Errands */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700">{runner.completedErrands} completed</span>
                        {runner.disputesAgainst > 0 && (
                          <span className="ml-2 text-xs text-red-500">{runner.disputesAgainst} disputes</span>
                        )}
                      </td>

                      {/* Verification */}
                      <td className="px-5 py-4">
                        <VerificationBadge status={runner.verificationStatus} />
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge isActive={runner.isActive} />
                      </td>

                      {/* Joined */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-500">{fmt(runner.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/users/${runner._id}`)}
                            title="View details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmTarget(runner)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              runner.isActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {runner.isActive ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => setDeleteTarget(runner)}
                            title="Delete runner permanently"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
            <p className="text-xs text-gray-500">
              Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Suspend / Activate confirm modal */}
      {confirmTarget && (
        <ConfirmModal
          user={confirmTarget}
          onConfirm={handleToggleConfirm}
          onCancel={() => { setConfirmTarget(null); setToggleError('') }}
          loading={toggleLoading}
        />
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          user={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          loading={deleteLoading}
        />
      )}
    </div>
  )
}
