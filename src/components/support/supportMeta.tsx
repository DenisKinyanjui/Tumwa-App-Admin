import { MessageCircle, Phone, Mail, LifeBuoy } from 'lucide-react'
import type { SupportStatus, SupportPriority, SupportCategory, SupportChannel } from '../../types'

// ── Status ────────────────────────────────────────────────────────────────────

export const STATUS_META: Record<SupportStatus, { label: string; dot: string; className: string }> = {
  open:          { label: 'Open',           dot: 'bg-blue-400',   className: 'bg-blue-50 text-blue-700' },
  waiting_admin: { label: 'Waiting Admin',  dot: 'bg-amber-400',  className: 'bg-amber-50 text-amber-700' },
  waiting_user:  { label: 'Waiting User',   dot: 'bg-purple-400', className: 'bg-purple-50 text-purple-700' },
  resolved:      { label: 'Resolved',       dot: 'bg-green-400',  className: 'bg-green-50 text-green-700' },
  closed:        { label: 'Closed',         dot: 'bg-gray-400',   className: 'bg-gray-100 text-gray-500' },
}

export function StatusBadge({ status }: { status: SupportStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ── Priority ──────────────────────────────────────────────────────────────────

export const PRIORITY_META: Record<SupportPriority, { label: string; className: string }> = {
  low:      { label: 'Low',      className: 'bg-gray-100 text-gray-500' },
  medium:   { label: 'Medium',   className: 'bg-blue-50 text-blue-700' },
  high:     { label: 'High',     className: 'bg-orange-50 text-orange-700' },
  critical: { label: 'Critical', className: 'bg-red-50 text-red-700' },
}

export function PriorityBadge({ priority }: { priority: SupportPriority }) {
  const meta = PRIORITY_META[priority]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

// ── Role ──────────────────────────────────────────────────────────────────────

export function RoleBadge({ role }: { role: 'customer' | 'runner' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        role === 'runner' ? 'bg-accent-50 text-accent-700' : 'bg-primary-50 text-primary-700'
      }`}
    >
      {role}
    </span>
  )
}

// ── Category ──────────────────────────────────────────────────────────────────

export const CATEGORY_LABELS: Record<SupportCategory, string> = {
  payments: 'Payments',
  verification: 'Verification',
  withdrawals: 'Withdrawals',
  errands: 'Errands',
  technical_issue: 'Technical Issue',
  account: 'Account',
  refund: 'Refund',
  general_inquiry: 'General Inquiry',
  other: 'Other',
}

// ── Channel ───────────────────────────────────────────────────────────────────

export const CHANNEL_META: Record<SupportChannel, { label: string; icon: typeof MessageCircle }> = {
  live_chat: { label: 'Live Chat', icon: MessageCircle },
  whatsapp:  { label: 'WhatsApp',  icon: LifeBuoy },
  email:     { label: 'Email',     icon: Mail },
  call:      { label: 'Calls',     icon: Phone },
}

export const timeAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(iso).toLocaleDateString()
}
