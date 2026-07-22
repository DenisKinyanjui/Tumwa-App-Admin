import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { fetchUser, updateUser, approveVerification, fetchVerification } from '../services/api'
import type { UserDetailResponse } from '../services/api'
import type { UserRole, RunnerVerification } from '../types'
import VerificationBadge from '../components/VerificationBadge'
import { useAuth } from '../context/AuthContext'

// ── Shared badge components ───────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  customer:   'bg-blue-50 text-blue-700',
  runner:     'bg-purple-50 text-purple-700',
  admin:      'bg-orange-50 text-orange-700',
  superadmin: 'bg-red-50 text-red-700',
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ROLE_STYLES[role]}`}>
      {role}
    </span>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtCurrency(n: number) {
  return `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const ERRAND_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  pending:   'bg-yellow-50 text-yellow-700',
  active:    'bg-blue-50 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-500',
  disputed:  'bg-red-50 text-red-600',
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  pending:   'bg-yellow-50 text-yellow-700',
  failed:    'bg-red-50 text-red-600',
}

const TRANSPORT_LABELS: Record<string, string> = {
  motorbike:         'Motorbike',
  bicycle:           'Bicycle',
  car:               'Car',
  on_foot:           'On Foot',
  public_transport:  'Public Transport',
}

// ── Runner verification card ──────────────────────────────────────────────────

function PhotoThumb({ url, label }: { url: string | null | undefined; label: string }) {
  if (!url) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
        <div className="flex h-36 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-gray-200 bg-gray-50 text-gray-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M10.5 6H17a2 2 0 012 2v9m-3-1L10 10.5M3 8v10a2 2 0 002 2h9" />
          </svg>
          <span className="text-xs font-medium">Not uploaded</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="group relative block overflow-hidden rounded-xl border border-gray-100 bg-gray-50 hover:border-primary-300 transition">
        <img src={url} alt={label} className="h-36 w-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition">
          <svg className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </a>
    </div>
  )
}

interface VerificationCardProps {
  verification: RunnerVerification
  userId: string
  onRefresh: () => void
  refreshing?: boolean
}

// Read-only — verification decisions are made exclusively from the Identity
// Verification review screen now (see VerificationReview.tsx). This card
// just summarizes the current state and links there.
function VerificationSummaryCard({ verification, userId, onRefresh, refreshing }: VerificationCardProps) {
  const navigate = useNavigate()

  const hasSubmission = !!(
    verification.nationalId || verification.idFrontUrl || verification.idBackUrl || verification.selfieUrl
  )
  const areas = verification.areasOfOperation ?? []

  const reasonLabel =
    verification.status === 'rejected' ? 'Rejection Reason'
    : verification.status === 'resubmission_requested' ? 'Resubmission Reason'
    : null

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">Runner Verification</h4>
        <div className="flex items-center gap-2">
          <VerificationBadge status={verification.status} />
          <button
            onClick={onRefresh}
            disabled={refreshing}
            title="Refresh verification documents"
            className="flex items-center justify-center rounded-lg border border-gray-200 p-1.5 text-gray-400 transition hover:bg-gray-50 hover:text-gray-600 disabled:opacity-40"
          >
            <svg className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {!hasSubmission && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-yellow-100 bg-yellow-50 p-3 text-xs text-yellow-800">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          This runner has not submitted any verification documents. {verification.status === 'approved' ? 'They were approved manually by an admin.' : ''}
        </div>
      )}

      {/* Identity */}
      <div className="mb-5 grid grid-cols-2 gap-4 text-sm">
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
              areas.map((area) => (
                <span key={area} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">{area}</span>
              ))
            ) : (
              <span className="text-sm text-gray-400">Not provided</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Submitted</p>
          <p className="mt-1 text-gray-600">{hasSubmission ? fmt(verification.submittedAt) : '—'}</p>
        </div>
        {verification.reviewedAt && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              {verification.status === 'approved' ? 'Approved' : 'Reviewed'}
            </p>
            <p className="mt-1 text-gray-600">
              {fmt(verification.reviewedAt)}{verification.reviewedBy?.name ? ` by ${verification.reviewedBy.name}` : ''}
            </p>
          </div>
        )}
        {reasonLabel && verification.adminNotes && (
          <div className="col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{reasonLabel}</p>
            <p className="mt-1 text-gray-700">{verification.adminNotes}</p>
          </div>
        )}
      </div>

      {/* Photos (read-only) */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PhotoThumb url={verification.idFrontUrl} label="ID Front" />
        <PhotoThumb url={verification.idBackUrl}  label="ID Back" />
        <PhotoThumb url={verification.selfieUrl}  label="Selfie" />
        <PhotoThumb url={verification.profilePhotoUrl} label="Profile Photo" />
      </div>

      <button
        onClick={() => navigate(`/identity-verification/${userId}`)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
      >
        Open Verification Review
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )
}

// ── No-submission verification card ─────────────────────────────────────────
// Lets an admin approve a runner directly when they never submitted any
// verification documents (e.g. onboarded manually, or verified out-of-band).

function NoSubmissionVerificationCard({ userId, onApproved }: { userId: string; onApproved: (v: RunnerVerification) => void }) {
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [actionError, setActionError] = useState('')

  const handleApprove = async () => {
    setApproving(true)
    setActionError('')
    try {
      const created = await approveVerification(userId, notes || undefined)
      onApproved(created)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setApproving(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-900">Runner Verification</h4>
      <p className="mb-4 text-sm text-gray-400">No verification submission yet — this runner has not uploaded any documents.</p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Admin Notes</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the runner…"
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {actionError && <p className="text-xs text-red-600">{actionError}</p>}

        <button
          onClick={handleApprove}
          disabled={approving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
        >
          {approving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          Approve Without Documents
        </button>
      </div>
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
        {hint && <span className="ml-1 normal-case font-normal text-gray-400">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 disabled:bg-gray-50 disabled:text-gray-400'

// ── Wallet info row ───────────────────────────────────────────────────────────

function WalletRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface EditState {
  name: string
  phone: string
  role: string
  level: number
  rating: number
  cancelCount: number
  isActive: boolean
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [detail, setDetail] = useState<UserDetailResponse | null>(null)
  const [verification, setVerification] = useState<RunnerVerification | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshingVerification, setRefreshingVerification] = useState(false)

  const [form, setForm] = useState<EditState>({
    name: '', phone: '', role: 'customer',
    level: 1, rating: 0, cancelCount: 0, isActive: true,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError('')
    fetchUser(id)
      .then((data) => {
        setDetail(data)
        setVerification(data.verification)
        const u = data.user
        setForm({
          name:        u.name,
          phone:       u.phone,
          role:        u.role,
          level:       u.level,
          rating:      u.rating,
          cancelCount: u.cancelCount,
          isActive:    u.isActive,
        })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  const handleRefreshVerification = useCallback(async () => {
    if (!id) return
    setRefreshingVerification(true)
    try {
      const updated = await fetchVerification(id)
      setVerification(updated)
    } catch {
      // Ignore — existing data stays visible
    } finally {
      setRefreshingVerification(false)
    }
  }, [id])

  const set = <K extends keyof EditState>(key: K, value: EditState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const isDirty = detail
    ? form.name        !== detail.user.name        ||
      form.phone       !== detail.user.phone       ||
      form.role        !== detail.user.role        ||
      form.level       !== detail.user.level       ||
      form.rating      !== detail.user.rating      ||
      form.cancelCount !== detail.user.cancelCount ||
      form.isActive    !== detail.user.isActive
    : false

  const handleSave = async () => {
    if (!id || !detail) return
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      const updated = await updateUser(id, form)
      setDetail((prev) => prev ? { ...prev, user: updated } : prev)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-40 rounded-lg bg-gray-100" />
        <div className="h-28 rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="h-96 rounded-2xl bg-gray-100" />
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 rounded-2xl bg-gray-100" />
            <div className="h-48 rounded-2xl bg-gray-100" />
          </div>
        </div>
      </div>
    )
  }

  // ── Error state ─────────────────────────────────────────────────────────────

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error || 'User not found.'}
        </div>
      </div>
    )
  }

  const { user, recentErrands, recentPayments } = detail

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Details</h2>
          <p className="text-sm text-gray-500">View and edit user account information</p>
        </div>
      </div>

      {/* Profile strip */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xl font-bold text-primary-600">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{user.name}</span>
              <RoleBadge role={user.role} />
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-400'}`} />
                {user.isActive ? 'Active' : 'Suspended'}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{user.phone} &middot; Joined {fmt(user.createdAt)}</p>
          </div>
          <div className="hidden sm:flex gap-6 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900">{user.completedErrands}</p>
              <p className="text-xs text-gray-400">Errands</p>
            </div>
            {user.rating > 0 && (
              <div>
                <p className="text-lg font-bold text-gray-900">{user.rating.toFixed(1)}</p>
                <p className="text-xs text-gray-400">Rating</p>
              </div>
            )}
            <div>
              <p className={`text-lg font-bold ${user.disputesAgainst > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {user.disputesAgainst}
              </p>
              <p className="text-xs text-gray-400">Disputes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* ── Edit form ─────────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-5 text-sm font-bold uppercase tracking-wide text-gray-900">Edit Account</h4>

            <div className="space-y-4">

              {/* Name */}
              <Field label="Full Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Full name"
                  className={inputCls}
                />
              </Field>

              {/* Phone */}
              <Field label="Phone Number" hint="(e.g. +254712345678)">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+254..."
                  className={inputCls}
                />
              </Field>

              {/* Role */}
              <Field label="Role">
                <select
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  className={inputCls}
                >
                  <option value="customer">Customer</option>
                  <option value="runner">Runner</option>
                  <option value="admin">Admin</option>
                  {currentUser?.role === 'superadmin' && (
                    <option value="superadmin">Super Admin</option>
                  )}
                </select>
              </Field>

              {/* Level */}
              <Field label="Level" hint="(runner tier, min 1)">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={form.level}
                  onChange={(e) => set('level', Math.max(1, Number(e.target.value)))}
                  className={inputCls}
                />
              </Field>

              {/* Rating */}
              <Field label="Rating" hint="(0 – 5)">
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={form.rating}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value)
                    set('rating', isNaN(v) ? 0 : Math.min(5, Math.max(0, v)))
                  }}
                  className={inputCls}
                />
              </Field>

              {/* Cancel count */}
              <Field label="Cancel Count">
                <input
                  type="number"
                  min={0}
                  value={form.cancelCount}
                  onChange={(e) => set('cancelCount', Math.max(0, Number(e.target.value)))}
                  className={inputCls}
                />
              </Field>

              {/* Status */}
              <Field label="Account Status">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => set('isActive', true)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
                      form.isActive
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => set('isActive', false)}
                    disabled={form.role === 'admin' || form.role === 'superadmin'}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      !form.isActive
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'border border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    Suspend
                  </button>
                </div>
                {(form.role === 'admin' || form.role === 'superadmin') && (
                  <p className="mt-1.5 text-xs text-gray-400">Admin accounts cannot be suspended.</p>
                )}
              </Field>

            </div>

            {/* Feedback */}
            {saveError && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                <svg className="mt-0.5 h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {saveError}
              </div>
            )}
            {saveSuccess && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-xs text-green-700">
                <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Changes saved successfully.
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={!isDirty || saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              Save Changes
            </button>
          </div>
        </div>

        {/* ── Right column ──────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Runner verification */}
          {user.role === 'runner' && verification && (
            <VerificationSummaryCard
              verification={verification}
              userId={user._id}
              onRefresh={handleRefreshVerification}
              refreshing={refreshingVerification}
            />
          )}
          {user.role === 'runner' && !verification && (
            <NoSubmissionVerificationCard userId={user._id} onApproved={(v) => setVerification(v)} />
          )}

          {/* Wallet (read-only) */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-900">Wallet</h4>
            {user.role === 'runner' ? (
              <>
                <WalletRow label="Working Capital Limit" value={fmtCurrency(user.workingCapital?.limit ?? 0)} />
                <WalletRow label="Active Capacity"        value={fmtCurrency(user.workingCapital?.used ?? 0)} />
                <WalletRow label="Available Capacity"     value={fmtCurrency(Math.max(0, (user.workingCapital?.limit ?? 0) - (user.workingCapital?.used ?? 0)))} />
                <WalletRow label="Earnings"               value={fmtCurrency(user.wallet.earnings)} />
                <WalletRow label="Trust Balance"          value={fmtCurrency(user.wallet.trustBalance)} />
              </>
            ) : (
              <>
                <WalletRow label="Wallet Credit"  value={fmtCurrency(user.customerWallet?.balance ?? 0)} />
                <WalletRow label="Trust Balance"  value={fmtCurrency(user.wallet.trustBalance)} />
              </>
            )}
          </div>

          {/* Recent Errands */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">Recent Errands</h4>
            </div>
            {recentErrands.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No errands yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Title</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentErrands.map((e) => (
                      <tr
                        key={e._id}
                        onClick={() => navigate(`/errands/${e._id}`)}
                        className="cursor-pointer hover:bg-gray-50/50"
                      >
                        <td className="max-w-[180px] truncate px-5 py-3 text-sm font-medium text-gray-900">{e.title}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ERRAND_STATUS_STYLES[e.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-700">{fmtCurrency(e.amount)}</td>
                        <td className="px-5 py-3 text-sm text-gray-500">{fmt(e.createdAt)}</td>
                        <td className="px-5 py-3">
                          <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h4 className="text-sm font-bold uppercase tracking-wide text-gray-900">Recent Payments</h4>
            </div>
            {recentPayments.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-gray-400">No payments yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-50">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Amount</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentPayments.map((p) => (
                      <tr key={p._id} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-sm capitalize text-gray-900">{p.type}</td>
                        <td className="px-5 py-3 text-sm text-gray-700">{fmtCurrency(p.amount)}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${PAYMENT_STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-500">
                          {p.completedAt ? fmt(p.completedAt) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
