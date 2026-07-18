import { useCallback, useEffect, useState } from 'react'
import { fetchPayments } from '../services/api'
import type { Payment, PaymentType, PaymentStatus } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

// ── Type badge ────────────────────────────────────────────────────────────────

const TYPE_META: Record<PaymentType, { label: string; className: string }> = {
  errand_payment: { label: 'Errand Pay',     className: 'bg-blue-50 text-blue-700' },
  withdrawal:     { label: 'Withdrawal',     className: 'bg-amber-50 text-amber-700' },
  dispute_refund: { label: 'Dispute Refund', className: 'bg-teal-50 text-teal-700' },
  wallet_credit:  { label: 'Wallet Credit',  className: 'bg-purple-50 text-purple-700' },
}

function TypeBadge({ type }: { type: PaymentType }) {
  const { label, className } = TYPE_META[type] ?? { label: type, className: 'bg-gray-50 text-gray-600' }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      {label}
    </span>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<PaymentStatus, { label: string; dot: string; className: string }> = {
  completed: { label: 'Completed', dot: 'bg-green-500',  className: 'bg-green-50 text-green-700' },
  pending:   { label: 'Pending',   dot: 'bg-amber-400',  className: 'bg-amber-50 text-amber-700' },
  failed:    { label: 'Failed',    dot: 'bg-red-400',    className: 'bg-red-50 text-red-600' },
  cancelled: { label: 'Cancelled', dot: 'bg-gray-400',   className: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const { label, dot, className } = STATUS_META[status] ?? { label: status, dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ── Filter options ────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { label: 'All',            value: '' },
  { label: 'Errand Pay',     value: 'errand_payment' },
  { label: 'Withdrawal',     value: 'withdrawal' },
  { label: 'Dispute Refund', value: 'dispute_refund' },
  { label: 'Wallet Credit',  value: 'wallet_credit' },
] as const

const STATUS_FILTERS = [
  { label: 'All',       value: '' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending',   value: 'pending' },
  { label: 'Failed',    value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' },
] as const

const LIMIT = 20

// ── Payments page ─────────────────────────────────────────────────────────────

export default function Payments() {
  const [payments, setPayments]     = useState<Payment[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Filters
  const [typeFilter, setTypeFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [page, setPage]                 = useState(1)

  const load = useCallback((
    p: number, type: string, status: string, from: string, to: string,
  ) => {
    setLoading(true)
    setError('')
    fetchPayments({
      page: p,
      limit: LIMIT,
      type: type || undefined,
      status: status || undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    })
      .then((res) => {
        setPayments(res.data.payments)
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
    load(page, typeFilter, statusFilter, dateFrom, dateTo)
  }, [page, typeFilter, statusFilter, dateFrom, dateTo, load])

  const handleTypeChange = (v: string) => { setTypeFilter(v); setPage(1) }
  const handleStatusChange = (v: string) => { setStatusFilter(v); setPage(1) }
  const handleDateChange = (from: string, to: string) => {
    setDateFrom(from); setDateTo(to); setPage(1)
  }

  // Totals from current page (summary bar)
  const completedTotal = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Payments</h2>
        <p className="mt-0.5 text-sm text-gray-500">
          {pagination.total > 0 ? `${pagination.total} total transactions` : 'All M-Pesa transactions on the platform'}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Type filter */}
        <div className="flex flex-wrap rounded-xl bg-gray-100 p-1 gap-1">
          {TYPE_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleTypeChange(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                typeFilter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={label}
              onClick={() => handleStatusChange(value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
      {!loading && payments.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Showing</p>
            <p className="mt-0.5 text-sm font-bold text-gray-900">{payments.length} of {pagination.total}</p>
          </div>
          <div className="border-l border-gray-100 pl-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Completed (page)</p>
            <p className="mt-0.5 text-sm font-bold text-green-700">{fmt(completedTotal)}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button
            onClick={() => load(page, typeFilter, statusFilter, dateFrom, dateTo)}
            className="ml-auto text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Phone</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">User</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Errand</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">M-Pesa Ref</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                    </tr>
                  ))
                : payments.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                          </svg>
                          <p className="text-sm font-medium">No payments found</p>
                          <p className="text-xs">Try adjusting your filters</p>
                        </div>
                      </td>
                    </tr>
                  )
                : payments.map((payment) => {
                    const user = payment.customer ?? payment.runner
                    return (
                      <tr key={payment._id} className="transition-colors hover:bg-gray-50/50">
                        {/* Type */}
                        <td className="px-5 py-4">
                          <TypeBadge type={payment.type} />
                        </td>

                        {/* Amount */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-gray-900">{fmt(payment.amount)}</span>
                        </td>

                        {/* Phone */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-gray-600">{payment.phoneNumber}</span>
                        </td>

                        {/* User */}
                        <td className="px-5 py-4">
                          {user ? (
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                                {user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-900 max-w-[120px]">{user.name}</p>
                                <p className="text-xs text-gray-400">{payment.customer ? 'customer' : 'runner'}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Errand */}
                        <td className="px-5 py-4">
                          {payment.errand ? (
                            <p className="max-w-[140px] truncate text-sm text-gray-700" title={payment.errand.title}>
                              {payment.errand.title}
                            </p>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <StatusBadge status={payment.status} />
                            {payment.failureReason && (
                              <p className="text-xs text-red-500 max-w-[120px] truncate" title={payment.failureReason}>
                                {payment.failureReason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* M-Pesa Ref */}
                        <td className="px-5 py-4">
                          {payment.mpesa?.receiptNumber ? (
                            <span className="font-mono text-xs text-gray-700">{payment.mpesa.receiptNumber}</span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4">
                          <div>
                            <p className="text-sm text-gray-700 whitespace-nowrap">{fmtDate(payment.createdAt)}</p>
                            {payment.completedAt && (
                              <p className="text-xs text-gray-400 whitespace-nowrap">
                                Done {fmtDateTime(payment.completedAt)}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
    </div>
  )
}
