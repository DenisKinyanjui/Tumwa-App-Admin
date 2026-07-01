import { useCallback, useEffect, useState } from 'react'
import { X, ChevronRight, AlertTriangle } from 'lucide-react'
import {
  fetchDisputes,
  markDisputeUnderReview,
  resolveDisputeAdmin,
  rejectDisputeAdmin,
} from '../services/api'
import type { AdminDispute, DisputeStatus, ResolutionOutcome } from '../types'
import { useBadges } from '../context/BadgeContext'

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

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_META: Record<DisputeStatus, { label: string; dot: string; className: string }> = {
  pending:      { label: 'Pending',      dot: 'bg-amber-400',  className: 'bg-amber-50 text-amber-700' },
  under_review: { label: 'Under Review', dot: 'bg-blue-400',   className: 'bg-blue-50 text-blue-700' },
  resolved:     { label: 'Resolved',     dot: 'bg-green-500',  className: 'bg-green-50 text-green-700' },
  rejected:     { label: 'Rejected',     dot: 'bg-gray-400',   className: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status }: { status: DisputeStatus }) {
  const { label, dot, className } = STATUS_META[status] ?? {
    label: status, dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const cls = role === 'runner'
    ? 'bg-emerald-50 text-emerald-700'
    : 'bg-primary-50 text-primary-700'
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${cls}`}>
      {role}
    </span>
  )
}

// ── Outcome labels ────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: { value: ResolutionOutcome; label: string }[] = [
  { value: 'runner_at_fault',   label: 'Runner at fault (refund customer)' },
  { value: 'customer_at_fault', label: 'Customer at fault (pay runner)' },
  { value: 'no_action',         label: 'No action (dismiss)' },
  { value: 'partial',           label: 'Partial resolution' },
]

const OUTCOME_LABEL: Record<ResolutionOutcome, string> = {
  runner_at_fault:   'Runner at fault',
  customer_at_fault: 'Customer at fault',
  no_action:         'No action',
  partial:           'Partial',
}

// ── Status filter tabs ────────────────────────────────────────────────────────

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All',          value: '' },
  { label: 'Pending',      value: 'pending' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Resolved',     value: 'resolved' },
  { label: 'Rejected',     value: 'rejected' },
]

// ── Resolve form state ────────────────────────────────────────────────────────

interface ResolveForm {
  outcome: ResolutionOutcome | ''
  notes: string
  penaltyAmount: string
  refundAmount: string
}

const EMPTY_FORM: ResolveForm = { outcome: '', notes: '', penaltyAmount: '', refundAmount: '' }

// ── Detail panel ──────────────────────────────────────────────────────────────

function DetailPanel({
  dispute,
  onClose,
  onUpdated,
  onDisputeActioned,
}: {
  dispute: AdminDispute
  onClose: () => void
  onUpdated: (d: AdminDispute) => void
  onDisputeActioned: () => void
}) {
  const [actionLoading, setActionLoading] = useState<'review' | 'resolve' | 'reject' | null>(null)
  const [error, setError] = useState('')
  const [showResolveForm, setShowResolveForm] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [resolveForm, setResolveForm] = useState<ResolveForm>(EMPTY_FORM)
  const [rejectNotes, setRejectNotes] = useState('')

  const isOpen = dispute.status === 'pending' || dispute.status === 'under_review'

  const handleReview = async () => {
    setError('')
    setActionLoading('review')
    try {
      const updated = await markDisputeUnderReview(dispute._id)
      onUpdated(updated)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResolve = async () => {
    if (!resolveForm.outcome) { setError('Select an outcome.'); return }
    if (resolveForm.outcome === 'partial' && !resolveForm.penaltyAmount) {
      setError('Penalty amount is required for a partial outcome.')
      return
    }
    setError('')
    setActionLoading('resolve')
    try {
      const updated = await resolveDisputeAdmin(dispute._id, {
        outcome: resolveForm.outcome as ResolutionOutcome,
        notes: resolveForm.notes || undefined,
        penaltyAmount: resolveForm.penaltyAmount ? Number(resolveForm.penaltyAmount) : undefined,
        refundAmount: resolveForm.refundAmount ? Number(resolveForm.refundAmount) : undefined,
      })
      onUpdated(updated)
      onDisputeActioned()
      setShowResolveForm(false)
      setResolveForm(EMPTY_FORM)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    setError('')
    setActionLoading('reject')
    try {
      const updated = await rejectDisputeAdmin(dispute._id, rejectNotes || undefined)
      onUpdated(updated)
      onDisputeActioned()
      setShowRejectForm(false)
      setRejectNotes('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">Dispute Detail</h3>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{dispute._id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          {/* Status */}
          <div className="flex items-center gap-3">
            <StatusBadge status={dispute.status} />
            {dispute.fundsLockedAtDispute && (
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                Funds Locked
              </span>
            )}
          </div>

          {/* Errand */}
          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Errand</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-gray-900">{dispute.errand.title}</p>
              <p className="text-xs text-gray-500">Amount: {fmt(dispute.errand.amount)}</p>
              <p className="text-xs text-gray-500 capitalize">Status: {dispute.errand.status.replace('_', ' ')}</p>
            </div>
          </section>

          {/* Parties */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</p>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{dispute.customer.name}</p>
                <p className="text-xs text-gray-500">{dispute.customer.phone}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Runner</p>
              <div className="rounded-xl bg-gray-50 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{dispute.runner.name}</p>
                <p className="text-xs text-gray-500">{dispute.runner.phone}</p>
                <p className="text-xs text-gray-400">Rating: {dispute.runner.rating.toFixed(1)}</p>
              </div>
            </div>
          </section>

          {/* Raised by */}
          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Raised By</p>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                {dispute.raisedBy.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{dispute.raisedBy.name}</p>
                <RoleBadge role={dispute.raisedBy.role} />
              </div>
              <p className="ml-auto text-xs text-gray-400">{fmtDateTime(dispute.createdAt)}</p>
            </div>
          </section>

          {/* Reason & Description */}
          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</p>
            <p className="text-sm font-medium text-gray-800">{dispute.reason}</p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">{dispute.description}</p>
          </section>

          {/* Evidence */}
          {dispute.evidence.length > 0 && (
            <section>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Evidence ({dispute.evidence.length})
              </p>
              <ul className="space-y-1">
                {dispute.evidence.map((e, i) => (
                  <li key={i} className="text-xs text-blue-600 underline break-all">{e}</li>
                ))}
              </ul>
            </section>
          )}

          {/* Resolution */}
          {dispute.resolution?.outcome && (
            <section>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Resolution</p>
              <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1.5">
                <p className="text-sm font-semibold text-gray-900">
                  {OUTCOME_LABEL[dispute.resolution.outcome]}
                </p>
                {dispute.resolution.notes && (
                  <p className="text-xs text-gray-600">{dispute.resolution.notes}</p>
                )}
                {dispute.resolution.refundAmount != null && dispute.resolution.refundAmount > 0 && (
                  <p className="text-xs text-gray-500">Refund: {fmt(dispute.resolution.refundAmount)}</p>
                )}
                {dispute.resolution.penaltyAmount != null && dispute.resolution.penaltyAmount > 0 && (
                  <p className="text-xs text-gray-500">Penalty: {fmt(dispute.resolution.penaltyAmount)}</p>
                )}
                {dispute.resolution.resolvedBy && (
                  <p className="text-xs text-gray-400">
                    By {dispute.resolution.resolvedBy.name}
                    {dispute.resolution.resolvedAt && ` · ${fmtDateTime(dispute.resolution.resolvedAt)}`}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {/* Admin actions */}
          {isOpen && (
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</p>

              {/* Mark under review */}
              {dispute.status === 'pending' && (
                <button
                  onClick={handleReview}
                  disabled={!!actionLoading}
                  className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
                >
                  {actionLoading === 'review' ? 'Marking…' : 'Mark Under Review'}
                </button>
              )}

              {/* Resolve form */}
              {!showResolveForm ? (
                <button
                  onClick={() => { setShowResolveForm(true); setShowRejectForm(false) }}
                  disabled={!!actionLoading}
                  className="w-full rounded-xl bg-green-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50"
                >
                  Resolve Dispute
                </button>
              ) : (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Resolve</p>
                  <select
                    value={resolveForm.outcome}
                    onChange={(e) => setResolveForm((f) => ({ ...f, outcome: e.target.value as ResolutionOutcome }))}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-400"
                  >
                    <option value="">Select outcome…</option>
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  {resolveForm.outcome === 'partial' && (
                    <input
                      type="number"
                      min="0"
                      placeholder="Penalty amount (KES)"
                      value={resolveForm.penaltyAmount}
                      onChange={(e) => setResolveForm((f) => ({ ...f, penaltyAmount: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-400"
                    />
                  )}
                  {(resolveForm.outcome === 'runner_at_fault' || resolveForm.outcome === 'partial') && (
                    <input
                      type="number"
                      min="0"
                      placeholder="Refund amount (KES, optional)"
                      value={resolveForm.refundAmount}
                      onChange={(e) => setResolveForm((f) => ({ ...f, refundAmount: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-400"
                    />
                  )}
                  <textarea
                    rows={3}
                    placeholder="Admin notes (optional)"
                    value={resolveForm.notes}
                    onChange={(e) => setResolveForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowResolveForm(false); setResolveForm(EMPTY_FORM); setError('') }}
                      className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResolve}
                      disabled={!!actionLoading}
                      className="flex-1 rounded-lg bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === 'resolve' ? 'Resolving…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}

              {/* Reject form */}
              {!showRejectForm ? (
                <button
                  onClick={() => { setShowRejectForm(true); setShowResolveForm(false) }}
                  disabled={!!actionLoading}
                  className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  Reject Dispute
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Reject</p>
                  <textarea
                    rows={3}
                    placeholder="Reason for rejection (optional)"
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-red-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setShowRejectForm(false); setRejectNotes(''); setError('') }}
                      className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={!!actionLoading}
                      className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {actionLoading === 'reject' ? 'Rejecting…' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Disputes page ─────────────────────────────────────────────────────────────

export default function Disputes() {
  const { decrementOpenDisputes } = useBadges()
  const [disputes, setDisputes]   = useState<AdminDispute[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [statusFilter, setStatus] = useState('')
  const [selected, setSelected]   = useState<AdminDispute | null>(null)

  const load = useCallback((status: string) => {
    setLoading(true)
    setError('')
    fetchDisputes(status || undefined)
      .then(setDisputes)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(statusFilter) }, [statusFilter, load])

  const handleUpdated = (updated: AdminDispute) => {
    setDisputes((prev) => prev.map((d) => d._id === updated._id ? updated : d))
    setSelected(updated)
  }

  const handleStatusChange = (v: string) => { setStatus(v); setSelected(null) }

  const pending      = disputes.filter((d) => d.status === 'pending').length
  const underReview  = disputes.filter((d) => d.status === 'under_review').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Disputes</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            {disputes.length > 0
              ? `${disputes.length} dispute${disputes.length !== 1 ? 's' : ''} shown`
              : 'All dispute reports from users'}
          </p>
        </div>
        {(pending + underReview) > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 ring-1 ring-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">
              {pending + underReview} requiring action
            </span>
          </div>
        )}
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap rounded-xl bg-gray-100 p-1 gap-1">
        {STATUS_FILTERS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => handleStatusChange(value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
              statusFilter === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          {error}
          <button onClick={() => load(statusFilter)} className="ml-auto text-xs font-semibold underline">
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
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Errand</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Raised By</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Customer</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Runner</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Reason</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 animate-pulse rounded bg-gray-100" />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))
                : disputes.length === 0
                ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-gray-400">
                          <AlertTriangle className="h-8 w-8" strokeWidth={1.5} />
                          <p className="text-sm font-medium">No disputes found</p>
                          <p className="text-xs">Try changing the status filter</p>
                        </div>
                      </td>
                    </tr>
                  )
                : disputes.map((d) => (
                    <tr
                      key={d._id}
                      onClick={() => setSelected(d)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/70"
                    >
                      {/* Errand */}
                      <td className="px-5 py-4">
                        <p className="max-w-[150px] truncate text-sm font-semibold text-gray-900" title={d.errand.title}>
                          {d.errand.title}
                        </p>
                        <p className="text-xs text-gray-400">{fmt(d.errand.amount)}</p>
                      </td>

                      {/* Raised by */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                            {d.raisedBy.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{d.raisedBy.name}</p>
                            <RoleBadge role={d.raisedBy.role} />
                          </div>
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 whitespace-nowrap">{d.customer.name}</p>
                        <p className="text-xs text-gray-400">{d.customer.phone}</p>
                      </td>

                      {/* Runner */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 whitespace-nowrap">{d.runner.name}</p>
                        <p className="text-xs text-gray-400">{d.runner.phone}</p>
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-4">
                        <p className="max-w-[160px] truncate text-sm text-gray-700" title={d.reason}>
                          {d.reason}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge status={d.status} />
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <p className="text-sm text-gray-700 whitespace-nowrap">{fmtDate(d.createdAt)}</p>
                      </td>

                      {/* Chevron */}
                      <td className="px-4 py-4">
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail slide-over */}
      {selected && (
        <DetailPanel
          dispute={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onDisputeActioned={decrementOpenDisputes}
        />
      )}
    </div>
  )
}
