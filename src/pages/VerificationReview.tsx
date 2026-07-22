import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, RotateCcw, RefreshCw, FileText,
  Send, RotateCw,
} from 'lucide-react'
import {
  fetchUser, approveVerification, rejectVerification,
  requestResubmissionVerification, reopenVerification,
} from '../services/api'
import type { UserDetailResponse } from '../services/api'
import type { RunnerVerification, VerificationHistoryAction } from '../types'
import VerificationBadge, { VERIFICATION_STATUS_META } from '../components/VerificationBadge'
import { useBadges } from '../context/BadgeContext'

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

const TRANSPORT_LABELS: Record<string, string> = {
  motorbike: 'Motorbike', bicycle: 'Bicycle', car: 'Car',
  on_foot: 'On Foot', public_transport: 'Public Transport',
}

// ── Document viewer ───────────────────────────────────────────────────────────

function DocumentCard({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className="flex h-48 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
          <FileText className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-xs font-medium">Not uploaded</span>
        </div>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-xl border border-gray-200 bg-gray-50 hover:border-primary-300 transition">
        <img src={url} alt={label} className="h-48 w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
          <span className="text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition">View full size</span>
        </div>
      </a>
    </div>
  )
}

// ── Audit timeline ────────────────────────────────────────────────────────────

const HISTORY_META: Record<VerificationHistoryAction, { label: string; icon: typeof CheckCircle2; className: string }> = {
  submitted:                { label: 'Documents submitted',    icon: FileText,   className: 'bg-gray-100 text-gray-500' },
  resubmitted:               { label: 'Documents resubmitted',  icon: RefreshCw,  className: 'bg-blue-50 text-blue-600' },
  approved:                  { label: 'Approved',               icon: CheckCircle2, className: 'bg-green-50 text-green-600' },
  rejected:                  { label: 'Rejected',               icon: XCircle,    className: 'bg-red-50 text-red-500' },
  resubmission_requested:    { label: 'Resubmission requested', icon: Send,       className: 'bg-blue-50 text-blue-600' },
  reopened:                  { label: 'Reopened for review',    icon: RotateCw,   className: 'bg-amber-50 text-amber-600' },
}

function AuditTimeline({ verification }: { verification: RunnerVerification }) {
  const entries = [
    // Synthesized base entry — always present, even for records predating
    // the audit-history feature (which have an empty `history` array).
    { action: 'submitted' as const, adminId: null, adminName: null, reason: null, at: verification.submittedAt },
    ...(verification.history ?? []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => {
        const meta = HISTORY_META[entry.action] ?? HISTORY_META.submitted
        const Icon = meta.icon
        return (
          <div key={i} className="flex gap-3">
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                <p className="text-xs text-gray-400">{fmtDateTime(entry.at)}</p>
              </div>
              {entry.adminName && <p className="text-xs text-gray-500">by {entry.adminName}</p>}
              {entry.reason && <p className="mt-1 text-xs text-gray-600">"{entry.reason}"</p>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Reopen confirm ────────────────────────────────────────────────────────────

function ReopenConfirmModal({ onConfirm, onCancel, loading }: { onConfirm: () => void; onCancel: () => void; loading: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
          <RotateCw className="h-6 w-6 text-amber-500" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Reopen Verification?</h3>
        <p className="mt-1 text-sm text-gray-500">
          This moves the verification back to <span className="font-semibold text-gray-700">Pending</span> for
          re-review. The previous decision stays in the audit history below.
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Reopen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function VerificationReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { decrementPendingVerifications } = useBadges()

  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [verification, setVerification] = useState<RunnerVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [reason, setReason] = useState('')
  const [acting, setActing] = useState<'approve' | 'reject' | 'resubmit' | null>(null)
  const [actionError, setActionError] = useState('')
  const [reopenTarget, setReopenTarget] = useState(false)
  const [reopening, setReopening] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    fetchUser(id)
      .then((data) => {
        setDetail(data)
        setVerification(data.verification)
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleApprove = async () => {
    if (!id) return
    setActing('approve')
    setActionError('')
    try {
      const updated = await approveVerification(id, reason || undefined)
      setVerification(updated)
      setReason('')
      decrementPendingVerifications()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActing(null)
    }
  }

  const handleReject = async () => {
    if (!id) return
    if (!reason.trim()) { setActionError('A reason is required to reject.'); return }
    setActing('reject')
    setActionError('')
    try {
      const updated = await rejectVerification(id, reason)
      setVerification(updated)
      setReason('')
      decrementPendingVerifications()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActing(null)
    }
  }

  const handleRequestResubmission = async () => {
    if (!id) return
    if (!reason.trim()) { setActionError('A reason is required to request resubmission.'); return }
    setActing('resubmit')
    setActionError('')
    try {
      const updated = await requestResubmissionVerification(id, reason)
      setVerification(updated)
      setReason('')
      decrementPendingVerifications()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setActing(null)
    }
  }

  const handleReopen = async () => {
    if (!id) return
    setReopening(true)
    try {
      const updated = await reopenVerification(id)
      setVerification(updated)
      setReopenTarget(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reopen.')
    } finally {
      setReopening(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-gray-100" />
        <div className="h-24 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
      </div>
    )
  }

  if (error || !detail || !verification) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error || 'This runner has no verification submission to review.'}
        </div>
      </div>
    )
  }

  const { user } = detail
  const areas = verification.areasOfOperation ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-base font-bold text-primary-600">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold text-gray-900">{user.name}</p>
          <p className="text-sm text-gray-500">{user.phone}</p>
        </div>
        <VerificationBadge status={verification.status} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: documents + runner details */}
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">Submitted Documents</h4>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <DocumentCard url={verification.idFrontUrl} label="ID Front" />
              <DocumentCard url={verification.idBackUrl} label="ID Back" />
              <DocumentCard url={verification.selfieUrl} label="Selfie" />
              <DocumentCard url={verification.profilePhotoUrl} label="Profile Photo" />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">Runner Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">National ID</p>
                <p className="mt-1 font-mono text-gray-900">{verification.nationalId ?? 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Transport</p>
                <p className="mt-1 text-gray-900">
                  {verification.meansOfTransport ? (TRANSPORT_LABELS[verification.meansOfTransport] ?? verification.meansOfTransport) : 'Not provided'}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Areas of Operation</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {areas.length > 0 ? (
                    areas.map((area) => <span key={area} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">{area}</span>)
                  ) : (
                    <span className="text-sm text-gray-400">Not provided</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Submitted</p>
                <p className="mt-1 text-gray-600">{fmt(verification.submittedAt)}</p>
              </div>
              {verification.reviewedAt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Last Reviewed</p>
                  <p className="mt-1 text-gray-600">
                    {fmt(verification.reviewedAt)}{verification.reviewedBy?.name ? ` by ${verification.reviewedBy.name}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">Decision</h4>

            {actionError && <p className="mb-3 text-xs text-red-600">{actionError}</p>}

            {verification.status === 'pending' ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Reason <span className="normal-case font-normal text-gray-400">(required to reject or request resubmission)</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Optional for approval; required to reject or request resubmission…"
                    className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleApprove}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {acting === 'approve' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />}
                    Approve
                  </button>
                  <button
                    onClick={handleRequestResubmission}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-200 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
                  >
                    {acting === 'resubmit' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" /> : <Send className="h-4 w-4" strokeWidth={1.75} />}
                    Request Resubmission
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!!acting}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {acting === 'reject' ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" /> : <XCircle className="h-4 w-4" strokeWidth={1.75} />}
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  This verification has already been decided ({VERIFICATION_STATUS_META[verification.status].label}).
                  To change the decision, reopen it for re-review.
                </p>
                <button
                  onClick={() => setReopenTarget(true)}
                  className="flex items-center gap-2 rounded-xl border border-amber-200 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                >
                  <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
                  Reopen Verification
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: audit timeline */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-900">Audit History</h4>
            <AuditTimeline verification={verification} />
          </div>
        </div>
      </div>

      {reopenTarget && (
        <ReopenConfirmModal
          onConfirm={handleReopen}
          onCancel={() => setReopenTarget(false)}
          loading={reopening}
        />
      )}
    </div>
  )
}
