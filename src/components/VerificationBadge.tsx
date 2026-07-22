import type { VerificationStatus } from '../types'

// Single source of truth for verification status colors — used by the
// Identity Verification queue, the review screen, and UserDetail's
// read-only summary, so the same status always reads the same color
// everywhere in the admin panel.
export const VERIFICATION_STATUS_META: Record<VerificationStatus, { label: string; className: string; dot: string }> = {
  pending:                 { label: 'Pending',                 className: 'bg-amber-50 text-amber-700 border-amber-200',   dot: 'bg-amber-500' },
  approved:                { label: 'Approved',                className: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500' },
  rejected:                { label: 'Rejected',                className: 'bg-red-50 text-red-600 border-red-200',        dot: 'bg-red-500' },
  resubmission_requested:  { label: 'Resubmission Requested',  className: 'bg-blue-50 text-blue-700 border-blue-200',     dot: 'bg-blue-500' },
}

export default function VerificationBadge({ status }: { status: VerificationStatus }) {
  const meta = VERIFICATION_STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}
