import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchErrands,
  cancelErrandAdmin,
  assignRunnerAdmin,
  fetchUsers,
} from '../services/api'
import type { Errand, ErrandStatus, AdminUser } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<ErrandStatus, { label: string; dot: string; className: string }> = {
  pending:     { label: 'Pending',     dot: 'bg-amber-400',  className: 'bg-amber-50 text-amber-700' },
  marketplace: { label: 'Marketplace', dot: 'bg-blue-400',   className: 'bg-blue-50 text-blue-700' },
  assigned:    { label: 'Assigned',    dot: 'bg-indigo-400', className: 'bg-indigo-50 text-indigo-700' },
  in_progress: { label: 'In Progress', dot: 'bg-cyan-400',   className: 'bg-cyan-50 text-cyan-700' },
  completed:   { label: 'Completed',   dot: 'bg-teal-400',   className: 'bg-teal-50 text-teal-700' },
  confirmed:   { label: 'Confirmed',   dot: 'bg-green-500',  className: 'bg-green-50 text-green-700' },
  cancelled:   { label: 'Cancelled',   dot: 'bg-gray-400',   className: 'bg-gray-100 text-gray-500' },
  disputed:    { label: 'Disputed',    dot: 'bg-red-400',    className: 'bg-red-50 text-red-600' },
}

function StatusBadge({ status }: { status: ErrandStatus }) {
  const meta = STATUS_META[status] ?? { label: status, dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ── Filter options ────────────────────────────────────────────────────────────

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  ...(Object.keys(STATUS_META) as ErrandStatus[]).map((s) => ({ label: STATUS_META[s].label, value: s })),
]

const PAID_FILTERS = [
  { label: 'All',     value: '' as const },
  { label: 'Paid',    value: true  as const },
  { label: 'Unpaid',  value: false as const },
] as const

const CANCELLABLE: ErrandStatus[] = ['pending', 'marketplace', 'assigned', 'in_progress']
const ASSIGNABLE: ErrandStatus[] = ['pending', 'marketplace', 'assigned']

const LIMIT = 20

// ── Cancel confirm modal ──────────────────────────────────────────────────────

function CancelModal({
  errand, onConfirm, onCancel, loading, error,
}: { errand: Errand; onConfirm: () => void; onCancel: () => void; loading: boolean; error: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900">Cancel Errand?</h3>
        <p className="mt-1 text-sm text-gray-500">
          Are you sure you want to cancel <span className="font-semibold text-gray-700">"{errand.title}"</span>?
          {errand.runner && " The runner's working capital will be released."}
        </p>
        {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Keep Errand
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Cancel Errand
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Assign runner modal ───────────────────────────────────────────────────────

function AssignRunnerModal({
  errand, onConfirm, onCancel, loading, error,
}: { errand: Errand; onConfirm: (runnerId: string) => void; onCancel: () => void; loading: boolean; error: string }) {
  const [runners, setRunners] = useState<AdminUser[]>([])
  const [runnersLoading, setRunnersLoading] = useState(true)
  const [selected, setSelected] = useState('')

  useEffect(() => {
    fetchUsers({ role: 'runner', isActive: true, limit: 100 })
      .then((res) => setRunners(res.data.users))
      .finally(() => setRunnersLoading(false))
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <h3 className="text-base font-bold text-gray-900">
          {errand.runner ? 'Reassign Runner' : 'Assign Runner'}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Choose an active runner for <span className="font-semibold text-gray-700">"{errand.title}"</span>.
        </p>

        <div className="mt-4">
          {runnersLoading ? (
            <div className="h-10 animate-pulse rounded-xl bg-gray-100" />
          ) : runners.length === 0 ? (
            <p className="text-sm text-gray-400">No active runners available.</p>
          ) : (
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">Select a runner...</option>
              {runners.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name} — {r.phone} (Level {r.level}, ★{r.rating.toFixed(1)})
                </option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="mt-2 text-xs font-semibold text-red-500">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={loading || !selected}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Assign
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Errands page ───────────────────────────────────────────────────────────────

export default function Errands() {
  const navigate = useNavigate()
  const [errands, setErrands]       = useState<Errand[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [paidFilter, setPaidFilter]     = useState<boolean | ''>('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  // Actions
  const [cancelTarget, setCancelTarget]   = useState<Errand | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError]     = useState('')
  const [assignTarget, setAssignTarget]   = useState<Errand | null>(null)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignError, setAssignError]     = useState('')

  const load = useCallback((
    p: number, status: string, paid: boolean | '', from: string, to: string,
  ) => {
    setLoading(true)
    setError('')
    fetchErrands({
      page: p,
      limit: LIMIT,
      status: status || undefined,
      isPaid: paid,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    })
      .then((res) => {
        setErrands(res.data.errands)
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
    load(page, statusFilter, paidFilter, dateFrom, dateTo)
  }, [page, statusFilter, paidFilter, dateFrom, dateTo, load])

  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1) }
  const handlePaidChange = (v: boolean | '') => { setPaidFilter(v); setPage(1) }
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from); setDateTo(to); setPage(1)
  }

  const reload = () => load(page, statusFilter, paidFilter, dateFrom, dateTo)

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return
    setCancelLoading(true)
    setCancelError('')
    try {
      const updated = await cancelErrandAdmin(cancelTarget._id)
      setErrands((prev) => prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)))
      setCancelTarget(null)
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Failed to cancel errand.')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleAssignConfirm = async (runnerId: string) => {
    if (!assignTarget) return
    setAssignLoading(true)
    setAssignError('')
    try {
      const updated = await assignRunnerAdmin(assignTarget._id, runnerId)
      setErrands((prev) => prev.map((e) => (e._id === updated._id ? { ...e, ...updated } : e)))
      setAssignTarget(null)
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : 'Failed to assign runner.')
    } finally {
      setAssignLoading(false)
    }
  }

  const totalValue = errands.reduce((sum, e) => sum + e.amount, 0)
  const disputedCount = errands.filter((e) => e.status === 'disputed').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Errands</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {pagination.total > 0 ? `${pagination.total} total errands` : 'All errands on the platform'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        >
          {STATUS_FILTERS.map(({ label, value }) => (
            <option key={label} value={value}>{label}</option>
          ))}
        </select>

        {/* Paid filter */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {PAID_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handlePaidChange(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                paidFilter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => handleDateChange(e.target.value, dateTo)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => handleDateChange(dateFrom, e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => handleDateChange('', '')}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {!loading && errands.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Showing</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{errands.length} of {pagination.total}</p>
          </div>
          <div className="border-l border-gray-100 pl-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Total value (page)</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{fmt(totalValue)}</p>
          </div>
          {disputedCount > 0 && (
            <div className="border-l border-gray-100 pl-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Disputed (page)</p>
              <p className="mt-0.5 text-sm font-bold text-red-600">{disputedCount}</p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={reload} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Errand</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Runner</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Created</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : errands.length === 0
                ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <p className="text-sm font-medium">No errands found</p>
                          <p className="text-xs">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                : errands.map((errand) => (
                    <tr key={errand._id} className="transition-colors hover:bg-gray-50/50">
                      {/* Errand */}
                      <td className="px-5 py-4">
                        <p className="max-w-[180px] truncate text-sm font-semibold text-gray-900" title={errand.title}>
                          {errand.title}
                        </p>
                        <p className="text-xs text-gray-400">{errand.isPaid ? 'Paid' : 'Unpaid'}</p>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        {errand.customer ? (
                          <div>
                            <p className="text-sm text-gray-700">{errand.customer.name}</p>
                            <p className="text-xs text-gray-400">{errand.customer.phone}</p>
                          </div>
                        ) : <span className="text-sm text-gray-400">—</span>}
                      </td>

                      {/* Runner */}
                      <td className="px-5 py-4">
                        {errand.runner ? (
                          <div>
                            <p className="text-sm text-gray-700">{errand.runner.name}</p>
                            <p className="text-xs text-gray-400">{errand.runner.phone}</p>
                          </div>
                        ) : <span className="text-sm text-gray-400">Unassigned</span>}
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-gray-900">{fmt(errand.amount)}</span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={errand.status} />
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4">
                        <span className="text-sm text-gray-700 whitespace-nowrap">{fmtDate(errand.createdAt)}</span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/errands/${errand._id}`)}
                            title="View details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          {ASSIGNABLE.includes(errand.status) && (
                            <button
                              onClick={() => setAssignTarget(errand)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition-colors whitespace-nowrap"
                            >
                              {errand.runner ? 'Reassign' : 'Assign'}
                            </button>
                          )}
                          {CANCELLABLE.includes(errand.status) && (
                            <button
                              onClick={() => setCancelTarget(errand)}
                              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Cancel
                            </button>
                          )}
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

      {/* Cancel confirm modal */}
      {cancelTarget && (
        <CancelModal
          errand={cancelTarget}
          onConfirm={handleCancelConfirm}
          onCancel={() => { setCancelTarget(null); setCancelError('') }}
          loading={cancelLoading}
          error={cancelError}
        />
      )}

      {/* Assign runner modal */}
      {assignTarget && (
        <AssignRunnerModal
          errand={assignTarget}
          onConfirm={handleAssignConfirm}
          onCancel={() => { setAssignTarget(null); setAssignError('') }}
          loading={assignLoading}
          error={assignError}
        />
      )}
    </div>
  )
}
