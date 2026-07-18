import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchErrand, excuseCancellationAdmin } from '../services/api'
import type { ErrandDetailResponse } from '../services/api'
import type { ErrandStatus } from '../types'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

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
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${meta.className}`}>
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-gray-400">{title}</h4>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-50 py-2.5 last:border-0">
      <span className="shrink-0 text-sm text-gray-400">{label}</span>
      <span className="text-right text-sm font-medium text-gray-800">{value}</span>
    </div>
  )
}

// ── Proof image ───────────────────────────────────────────────────────────────

function ProofImage({ url }: { url: string }) {
  const [lightbox, setLightbox] = useState(false)

  return (
    <>
      <button
        onClick={() => setLightbox(true)}
        className="group relative block w-full overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition hover:border-primary-300"
      >
        <img
          src={url}
          alt="Proof of completion"
          className="w-full object-cover"
          style={{ maxHeight: 340 }}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
          <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-gray-700 opacity-0 shadow transition group-hover:opacity-100">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
            </svg>
            View full size
          </div>
        </div>
      </button>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-center gap-1.5 text-xs text-primary-600 hover:underline"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        Open in new tab
      </a>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(false)}
        >
          <button
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={url}
            alt="Proof of completion"
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ErrandDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [data, setData] = useState<ErrandDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [excusing, setExcusing] = useState(false)
  const [excuseError, setExcuseError] = useState('')

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    fetchErrand(id)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-gray-100" />
        <div className="h-24 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="h-64 rounded-2xl bg-gray-100" />
          <div className="h-64 rounded-2xl bg-gray-100" />
          <div className="h-48 rounded-2xl bg-gray-100" />
          <div className="h-48 rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error || 'Errand not found.'}
        </div>
      </div>
    )
  }

  const { errand, payment, dispute } = data

  const handleExcuseCancellation = async () => {
    if (!id) return
    setExcusing(true)
    setExcuseError('')
    try {
      const updated = await excuseCancellationAdmin(id)
      setData((prev) => (prev ? { ...prev, errand: updated } : prev))
    } catch (err) {
      setExcuseError(err instanceof Error ? err.message : 'Failed to excuse cancellation.')
    } finally {
      setExcusing(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-bold text-gray-900">{errand.title}</h2>
          <p className="text-sm text-gray-400">Errand ID: {errand._id}</p>
        </div>
        <StatusBadge status={errand.status} />
      </div>

      {/* Description + location strip */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        {errand.description && (
          <p className="mb-3 text-sm text-gray-700">{errand.description}</p>
        )}
        <div className="flex items-start gap-2 text-sm text-gray-500">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{errand.location.address}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className={`rounded-full px-2.5 py-0.5 font-semibold ${errand.isPaid ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {errand.isPaid ? 'Paid' : 'Unpaid'}
          </span>
          {errand.capacityUsed && (
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 font-semibold text-blue-700">Capacity used</span>
          )}
          {errand.cancelledBy && (
            <span className="rounded-full bg-red-50 px-2.5 py-0.5 font-semibold text-red-600">
              Cancelled by {errand.cancelledBy}
            </span>
          )}
          {errand.cancelledBy === 'runner' && errand.excusedCancellation && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 font-semibold text-gray-600">Excused</span>
          )}
        </div>
        {errand.cancelledBy === 'runner' && !errand.excusedCancellation && errand.cancelledByRunnerId && (
          <div className="mt-3">
            <button
              onClick={handleExcuseCancellation}
              disabled={excusing}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              {excusing ? 'Excusing…' : 'Excuse cancellation (restore working capital limit)'}
            </button>
            {excuseError && <p className="mt-1.5 text-xs text-red-600">{excuseError}</p>}
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        {/* People */}
        <Section title="People">
          <Row
            label="Customer"
            value={errand.customer
              ? <span>{errand.customer.name}<br /><span className="text-xs text-gray-400">{errand.customer.phone}</span></span>
              : '—'}
          />
          <Row
            label="Runner"
            value={errand.runner
              ? <span>{errand.runner.name}<br /><span className="text-xs text-gray-400">{errand.runner.phone}</span></span>
              : <span className="text-gray-400">Unassigned</span>}
          />
          {errand.runner?.rating !== undefined && errand.runner.rating > 0 && (
            <Row label="Runner rating" value={`★ ${errand.runner.rating.toFixed(1)}`} />
          )}
          {errand.runner?.level !== undefined && (
            <Row label="Runner level" value={`Level ${errand.runner.level}`} />
          )}
        </Section>

        {/* Financials */}
        <Section title="Financials">
          <Row label="Errand amount"    value={fmt(errand.amount)} />
          <Row label="Customer pays"    value={fmt(errand.totalCustomerPays)} />
          <Row label="Runner commission" value={fmt(errand.runnerCommission)} />
          <Row label="Runner receives"  value={fmt(errand.runnerReceives)} />
          <Row label="Platform earns"   value={fmt(errand.platformEarns)} />
          <Row label="Trust held"       value={fmt(errand.trustHeld)} />
          {errand.paidAt && (
            <Row label="Paid at" value={fmtDateTime(errand.paidAt)} />
          )}
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          <Row label="Created"   value={fmtDateTime(errand.createdAt)} />
          {errand.assignedAt  && <Row label="Assigned"   value={fmtDateTime(errand.assignedAt)} />}
          {errand.startedAt   && <Row label="Started"    value={fmtDateTime(errand.startedAt)} />}
          {errand.completedAt && <Row label="Completed"  value={fmtDateTime(errand.completedAt)} />}
          {errand.confirmedAt && <Row label="Confirmed"  value={fmtDateTime(errand.confirmedAt)} />}
          {errand.cancelledAt && <Row label="Cancelled"  value={fmtDateTime(errand.cancelledAt)} />}
          {errand.disputedAt  && <Row label="Disputed"   value={fmtDateTime(errand.disputedAt)} />}
        </Section>

        {/* Payment */}
        {payment && (
          <Section title="Payment">
            <Row label="Status" value={payment.status} />
            <Row label="Amount" value={fmt(payment.amount)} />
            {payment.mpesa?.receiptNumber && (
              <Row label="M-Pesa receipt" value={<span className="font-mono text-xs">{payment.mpesa.receiptNumber}</span>} />
            )}
            {payment.phoneNumber && (
              <Row label="Phone" value={payment.phoneNumber} />
            )}
          </Section>
        )}

        {/* Dispute / cancel */}
        {(errand.disputeReason || errand.cancelReason || dispute) && (
          <div className="rounded-2xl bg-red-50 p-6 ring-1 ring-red-100">
            <h4 className="mb-4 text-xs font-bold uppercase tracking-wide text-red-400">Issue</h4>
            {errand.cancelReason && (
              <Row label="Cancel reason" value={errand.cancelReason} />
            )}
            {errand.disputeReason && (
              <Row label="Dispute reason" value={errand.disputeReason} />
            )}
            {dispute && (
              <>
                <Row label="Dispute status" value={dispute.status} />
                {dispute.reason && <Row label="Dispute detail" value={dispute.reason} />}
              </>
            )}
          </div>
        )}

      </div>

      {/* Proof of completion */}
      {errand.proofPhotoUrl ? (
        <Section title="Proof of Completion">
          <ProofImage url={errand.proofPhotoUrl} />
          {errand.proofOfCompletion && (
            <p className="mt-2 text-sm text-gray-600">{errand.proofOfCompletion}</p>
          )}
        </Section>
      ) : (
        (errand.proofOfCompletion || ['completed', 'confirmed'].includes(errand.status)) && (
          <Section title="Proof of Completion">
            {errand.proofOfCompletion
              ? <p className="text-sm text-gray-600">{errand.proofOfCompletion}</p>
              : <p className="text-sm text-gray-400">No proof image was uploaded for this errand.</p>}
          </Section>
        )
      )}

    </div>
  )
}
