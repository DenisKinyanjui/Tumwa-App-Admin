import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Plus, Search, Download, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  Send, Clock, FileEdit, AlertCircle, Eye, Pencil, Copy, Trash2, MoreVertical,
  Inbox, X, Settings2, Radar, Megaphone, BellRing, Users, User, Footprints, UserSearch,
} from 'lucide-react'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import type {
  NotificationCampaign, NotificationAudience, NotificationCampaignType, NotificationCampaignStatus,
  NotificationCampaignStats, SystemNotificationEvent,
} from '../types'
import {
  fetchNotificationCampaigns, fetchNotificationStats, fetchSystemNotificationEvents,
  fetchNotificationCampaign, duplicateNotificationCampaign, deleteNotificationCampaign,
} from '../services/api'
import NotificationComposer from '../components/notifications/NotificationComposer'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`

const PAGE_SIZE = 8

const AUDIENCE_META: Record<NotificationAudience, { label: string; icon: typeof Users }> = {
  all: { label: 'All Users', icon: Users },
  customers: { label: 'Customers', icon: User },
  runners: { label: 'Runners', icon: Footprints },
  specific: { label: 'Specific Users', icon: UserSearch },
}

const TYPE_META: Record<NotificationCampaignType, { label: string; icon: typeof Settings2; className: string }> = {
  system: { label: 'System', icon: Settings2, className: 'bg-gray-100 text-gray-600' },
  promotion: { label: 'Promotion', icon: Radar, className: 'bg-accent-50 text-accent-700' },
  announcement: { label: 'Announcement', icon: Megaphone, className: 'bg-blue-50 text-blue-700' },
  reminder: { label: 'Reminder', icon: BellRing, className: 'bg-purple-50 text-purple-700' },
}

const STATUS_META: Record<NotificationCampaignStatus, { label: string; dot: string; className: string }> = {
  draft: { label: 'Draft', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-400', className: 'bg-amber-50 text-amber-700' },
  sent: { label: 'Sent', dot: 'bg-green-500', className: 'bg-green-50 text-green-700' },
  failed: { label: 'Failed', dot: 'bg-red-400', className: 'bg-red-50 text-red-600' },
}

function specificAudienceLabel(c: NotificationCampaign) {
  const n = c.specificUserIds.length
  return n === 1 ? '1 selected user' : `${n} selected users`
}

function StatusBadge({ status }: { status: NotificationCampaignStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }: { type: NotificationCampaignType }) {
  const meta = TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <meta.icon className="h-3 w-3" strokeWidth={2} />
      {meta.label}
    </span>
  )
}

function StatCard({
  label, value, sub, icon: Icon, iconBg, iconColor,
}: {
  label: string
  value: string | number
  sub: string
  icon: typeof Send
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({
  campaign, onView, onEdit, onDuplicate, onDelete, onClose,
}: {
  campaign: NotificationCampaign
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const editable = campaign.status === 'draft' || campaign.status === 'scheduled'
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
        <button onClick={onView} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        {editable && (
          <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
        <button onClick={onDuplicate} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Copy className="h-3.5 w-3.5" /> Duplicate
        </button>
        <div className="my-1 border-t border-gray-100" />
        <button onClick={onDelete} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirmModal({
  campaign, onConfirm, onCancel, loading, error,
}: {
  campaign: NotificationCampaign
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <Trash2 className="h-6 w-6 text-red-500" strokeWidth={1.75} />
        </div>
        <h3 className="text-base font-bold text-gray-900">Delete notification?</h3>
        <p className="mt-1 text-sm text-gray-500">
          This will permanently delete <span className="font-semibold text-gray-700">{campaign.title}</span>. This cannot be undone.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel} disabled={loading} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ title, sub, onCreate }: { title: string; sub: string; onCreate?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-50">
        <Inbox className="h-6 w-6 text-gray-300" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-700">{title}</p>
        <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
      </div>
      {onCreate && (
        <button onClick={onCreate} className="mt-1 flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-700">
          <Plus className="h-3.5 w-3.5" /> New Notification
        </button>
      )}
    </div>
  )
}

// ── System notification view modal ───────────────────────────────────────────

function SystemEventModal({ event, onClose }: { event: SystemNotificationEvent; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-700">System · View only</span>
            <h3 className="mt-2 text-base font-bold text-gray-900">{event.label}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">{event.description}</p>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{event.totalSent.toLocaleString()}</p>
            <p className="text-[11px] text-gray-400">Total Sent</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-lg font-bold text-gray-900">{event.last24h}</p>
            <p className="text-[11px] text-gray-400">Last 24h</p>
          </div>
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-sm font-bold text-gray-900 capitalize">{event.audience}</p>
            <p className="text-[11px] text-gray-400">Audience</p>
          </div>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Last triggered {event.lastTriggeredAt ? fmtDateTime(event.lastTriggeredAt) : 'never'}. This notification fires automatically from platform events and cannot be edited or scheduled.
        </p>

        <button onClick={onClose} className="mt-5 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
          Close
        </button>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'campaigns' | 'system'

export default function Notifications() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const navigate = useNavigate()

  useEffect(() => {
    setSubtitle('Create, schedule and manage push notifications.')
  }, [setSubtitle])

  const [tab, setTab] = useState<Tab>('campaigns')

  // Campaign list
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  // Stats
  const [stats, setStats] = useState<NotificationCampaignStats | null>(null)

  // System events
  const [systemEvents, setSystemEvents] = useState<SystemNotificationEvent[]>([])
  const [systemLoading, setSystemLoading] = useState(true)
  const [systemError, setSystemError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<NotificationAudience | ''>('')
  const [statusFilter, setStatusFilter] = useState<NotificationCampaignStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, audienceFilter, statusFilter, dateFrom, dateTo])

  // Composer / menus / delete
  const [composer, setComposer] = useState<{ mode: 'create' } | { mode: 'edit'; campaign: NotificationCampaign } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<NotificationCampaign | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [systemView, setSystemView] = useState<SystemNotificationEvent | null>(null)

  const loadCampaigns = useCallback(() => {
    setLoading(true)
    setListError('')
    fetchNotificationCampaigns({
      page, limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      audience: audienceFilter || undefined,
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        setCampaigns(res.data.campaigns)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setListError(err.message))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, audienceFilter, statusFilter, dateFrom, dateTo])

  const loadStats = useCallback(() => {
    fetchNotificationStats().then(setStats).catch(() => {})
  }, [])

  const loadSystemEvents = useCallback(() => {
    setSystemLoading(true)
    setSystemError('')
    fetchSystemNotificationEvents()
      .then(setSystemEvents)
      .catch((err: Error) => setSystemError(err.message))
      .finally(() => setSystemLoading(false))
  }, [])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])
  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadSystemEvents() }, [loadSystemEvents])

  const refreshAfterMutation = () => { loadCampaigns(); loadStats() }

  const hasActiveFilters = !!(search || audienceFilter || statusFilter || dateFrom || dateTo)

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleComposerSaved = () => {
    setComposer(null)
    refreshAfterMutation()
  }

  const handleEdit = async (c: NotificationCampaign) => {
    setOpenMenuId(null)
    try {
      const full = await fetchNotificationCampaign(c._id)
      setComposer({ mode: 'edit', campaign: full })
    } catch {
      setComposer({ mode: 'edit', campaign: c })
    }
  }

  const handleDuplicate = async (c: NotificationCampaign) => {
    setOpenMenuId(null)
    try {
      await duplicateNotificationCampaign(c._id)
      refreshAfterMutation()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to duplicate notification.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteNotificationCampaign(deleteTarget._id)
      setDeleteTarget(null)
      refreshAfterMutation()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete notification.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetchNotificationCampaigns({
        page: 1, limit: 100,
        search: debouncedSearch || undefined,
        audience: audienceFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const header = ['Title', 'Audience', 'Type', 'Status', 'Sent/Scheduled', 'Recipients', 'Delivered', 'Opened', 'Failed']
      const rows = res.data.campaigns.map((c) => [
        c.title,
        c.audience === 'specific' ? specificAudienceLabel(c) : AUDIENCE_META[c.audience].label,
        TYPE_META[c.type].label, STATUS_META[c.status].label,
        c.sentAt ?? c.scheduledAt ?? '', String(c.recipients), String(c.delivered), String(c.opened), String(c.failed),
      ])
      const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tumwa-notifications-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to export notifications.')
    }
  }

  const clearFilters = () => { setSearch(''); setAudienceFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create, schedule and manage push notifications.</p>
        </div>
        <button
          onClick={() => setComposer({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New Notification
        </button>
      </div>

      {/* Stat cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Sent" value={stats.totalSent} sub="Campaigns delivered" icon={Send} iconBg="bg-green-50" iconColor="text-green-600" />
          <StatCard label="Scheduled" value={stats.scheduled} sub="Queued for later" icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatCard label="Drafts" value={stats.drafts} sub="Not yet sent" icon={FileEdit} iconBg="bg-gray-100" iconColor="text-gray-500" />
          <StatCard label="Failed Deliveries" value={stats.failedDeliveries.toLocaleString()} sub="Across all campaigns" icon={AlertCircle} iconBg="bg-red-50" iconColor="text-red-500" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-100">
        <button
          onClick={() => setTab('campaigns')}
          className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${tab === 'campaigns' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Campaigns
        </button>
        <button
          onClick={() => setTab('system')}
          className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${tab === 'system' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          System Notifications
        </button>
      </div>

      {tab === 'campaigns' ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
              />
            </div>

            <div className="relative">
              <select
                value={audienceFilter}
                onChange={(e) => setAudienceFilter(e.target.value as NotificationAudience | '')}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">All Audiences</option>
                <option value="customers">Customers</option>
                <option value="runners">Runners</option>
                <option value="specific">Specific Users</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as NotificationCampaignStatus | '')}
                className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            </div>

            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <span className="text-xs text-gray-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="rounded-lg px-2.5 py-2 text-xs font-semibold text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                Clear
              </button>
            )}

            <button
              onClick={handleExport}
              disabled={pagination.total === 0}
              className="ml-auto flex items-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" strokeWidth={2} />
              Export
            </button>
          </div>

          {listError && (
            <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
              {listError}
              <button onClick={loadCampaigns} className="ml-auto text-xs font-semibold underline">Retry</button>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Notification</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Audience</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Sent / Scheduled</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Open Rate</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                        ))}
                      </tr>
                    ))
                  ) : campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        {!hasActiveFilters ? (
                          <EmptyState title="No notifications found" sub="Get started by creating your first push notification." onCreate={() => setComposer({ mode: 'create' })} />
                        ) : statusFilter === 'draft' ? (
                          <EmptyState title="No drafts" sub="Notifications you save without sending will show up here." />
                        ) : statusFilter === 'scheduled' ? (
                          <EmptyState title="No scheduled notifications" sub="Schedule a notification for later and it will appear here." />
                        ) : (
                          <EmptyState title="No notifications match your filters" sub="Try adjusting your search or filters." />
                        )}
                      </td>
                    </tr>
                  ) : campaigns.map((c) => {
                    const AudIcon = AUDIENCE_META[c.audience].icon
                    const openRate = c.delivered > 0 ? Math.round((c.opened / c.delivered) * 100) : null
                    const dateLabel = c.sentAt ?? c.scheduledAt
                    return (
                      <tr key={c._id} className="transition-colors hover:bg-gray-50/50">
                        <td className="px-5 py-4">
                          <p className="max-w-[260px] truncate text-sm font-semibold text-gray-900">{c.title}</p>
                          <p className="max-w-[260px] truncate text-xs text-gray-400">{c.message}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <AudIcon className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
                            {c.audience === 'specific' ? specificAudienceLabel(c) : AUDIENCE_META[c.audience].label}
                          </span>
                        </td>
                        <td className="px-5 py-4"><TypeBadge type={c.type} /></td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <StatusBadge status={c.status} />
                            {c.status === 'failed' && c.failureReason && (
                              <p className="max-w-[160px] truncate text-xs text-red-500" title={c.failureReason}>{c.failureReason}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {dateLabel ? (
                            <p className="whitespace-nowrap text-sm text-gray-700">{fmtDateTime(dateLabel)}</p>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {openRate === null ? (
                            <span className="text-sm text-gray-400">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-14 overflow-hidden rounded-full bg-gray-100">
                                <div className="h-full rounded-full bg-primary-500" style={{ width: `${openRate}%` }} />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">{openRate}%</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="relative">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === c._id ? null : c._id)}
                              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            {openMenuId === c._id && (
                              <RowMenu
                                campaign={c}
                                onView={() => { setOpenMenuId(null); navigate(`/notifications/${c._id}`) }}
                                onEdit={() => handleEdit(c)}
                                onDuplicate={() => handleDuplicate(c)}
                                onDelete={() => { setOpenMenuId(null); setDeleteTarget(c) }}
                                onClose={() => setOpenMenuId(null)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {!loading && pagination.totalPages > 1 && campaigns.length > 0 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4">
                <p className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages} &middot; {pagination.total} total</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 disabled:opacity-30">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages} className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 disabled:opacity-30">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* System notifications tab */
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
          {systemError ? (
            <div className="flex items-center gap-3 p-4 text-sm text-red-700">
              {systemError}
              <button onClick={loadSystemEvents} className="ml-auto text-xs font-semibold underline">Retry</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Event</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Audience</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Total Sent</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Last 24h</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Last Triggered</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                    <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {systemLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                        ))}
                      </tr>
                    ))
                  ) : systemEvents.map((ev) => (
                    <tr key={ev.key} className="transition-colors hover:bg-gray-50/50">
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{ev.label}</p>
                        <p className="max-w-[320px] truncate text-xs text-gray-400">{ev.description}</p>
                      </td>
                      <td className="px-5 py-4 text-sm capitalize text-gray-600">{ev.audience}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{ev.totalSent.toLocaleString()}</td>
                      <td className="px-5 py-4 text-sm text-gray-700">{ev.last24h}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">{ev.lastTriggeredAt ? fmtDateTime(ev.lastTriggeredAt) : '—'}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSystemView(ev)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {composer && (
        <NotificationComposer
          mode={composer.mode}
          initial={composer.mode === 'edit' ? composer.campaign : undefined}
          onClose={() => setComposer(null)}
          onSaved={handleComposerSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          campaign={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}

      {systemView && (
        <SystemEventModal event={systemView} onClose={() => setSystemView(null)} />
      )}
    </div>
  )
}
