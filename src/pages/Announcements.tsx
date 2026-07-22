import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import {
  Plus, Search, Download, Calendar, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Pencil, Copy, Trash2, MoreVertical, Inbox, ToggleLeft, ToggleRight,
  AppWindow, PanelTop, PanelBottom, MousePointerClick,
} from 'lucide-react'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import type {
  Announcement, AnnouncementAudience, AnnouncementTrigger, AnnouncementType, AnnouncementStatus,
} from '../types'
import {
  fetchAnnouncements, deleteAnnouncement, duplicateAnnouncement, activateAnnouncement, deactivateAnnouncement,
} from '../services/api'
import AnnouncementComposer from '../components/announcements/AnnouncementComposer'
import { AUDIENCE_META, TRIGGER_META } from '../components/announcements/announcementMeta'

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`

const PAGE_SIZE = 8

const TYPE_META: Record<AnnouncementType, { label: string; icon: typeof AppWindow }> = {
  modal: { label: 'Modal', icon: AppWindow },
  top_banner: { label: 'Top Banner', icon: PanelTop },
  bottom_sheet: { label: 'Bottom Sheet', icon: PanelBottom },
}

const STATUS_META: Record<AnnouncementStatus, { label: string; dot: string; className: string }> = {
  draft: { label: 'Draft', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-600' },
  scheduled: { label: 'Scheduled', dot: 'bg-amber-400', className: 'bg-amber-50 text-amber-700' },
  active: { label: 'Active', dot: 'bg-green-500', className: 'bg-green-50 text-green-700' },
  expired: { label: 'Expired', dot: 'bg-gray-400', className: 'bg-gray-100 text-gray-500' },
}

function StatusBadge({ status }: { status: AnnouncementStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function TypeBadge({ type }: { type: AnnouncementType }) {
  const meta = TYPE_META[type]
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 whitespace-nowrap">
      <meta.icon className="h-3 w-3" strokeWidth={2} />
      {meta.label}
    </span>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({
  announcement, onView, onEdit, onDuplicate, onDelete, onToggleActive, onClose,
}: {
  announcement: Announcement
  onView: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  onToggleActive: () => void
  onClose: () => void
}) {
  const editable = announcement.status === 'draft' || announcement.status === 'scheduled' || announcement.status === 'active'
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
        <button onClick={onView} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
          <Eye className="h-3.5 w-3.5" /> View
        </button>
        {editable && (
          <button onClick={onEdit} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
        )}
        {announcement.status !== 'expired' && (
          <button onClick={onToggleActive} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50">
            {announcement.active ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
            {announcement.active ? 'Deactivate' : 'Activate'}
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
  announcement, onConfirm, onCancel, loading, error,
}: {
  announcement: Announcement
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
        <h3 className="text-base font-bold text-gray-900">Delete announcement?</h3>
        <p className="mt-1 text-sm text-gray-500">
          This will permanently delete <span className="font-semibold text-gray-700">{announcement.title}</span>. This cannot be undone.
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
          <Plus className="h-3.5 w-3.5" /> New Announcement
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Announcements() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const navigate = useNavigate()

  useEffect(() => {
    setSubtitle('Create and manage in-app modals, banners and bottom sheets.')
  }, [setSubtitle])

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState('')

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<AnnouncementAudience | ''>('')
  const [triggerFilter, setTriggerFilter] = useState<AnnouncementTrigger | ''>('')
  const [statusFilter, setStatusFilter] = useState<AnnouncementStatus | ''>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => { setPage(1) }, [debouncedSearch, audienceFilter, triggerFilter, statusFilter, dateFrom, dateTo])

  const [composer, setComposer] = useState<{ mode: 'create' } | { mode: 'edit'; announcement: Announcement } | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setListError('')
    fetchAnnouncements({
      page, limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      audience: audienceFilter || undefined,
      trigger: triggerFilter || undefined,
      status: statusFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    })
      .then((res) => {
        setAnnouncements(res.data.announcements)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setListError(err.message))
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, audienceFilter, triggerFilter, statusFilter, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const hasActiveFilters = !!(search || audienceFilter || triggerFilter || statusFilter || dateFrom || dateTo)

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleComposerSaved = () => { setComposer(null); load() }

  const handleEdit = async (a: Announcement) => {
    setOpenMenuId(null)
    setComposer({ mode: 'edit', announcement: a })
  }

  const handleDuplicate = async (a: Announcement) => {
    setOpenMenuId(null)
    try { await duplicateAnnouncement(a._id); load() } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to duplicate announcement.')
    }
  }

  const handleToggleActive = async (a: Announcement) => {
    setOpenMenuId(null)
    setBusyId(a._id)
    try {
      await (a.active ? deactivateAnnouncement(a._id) : activateAnnouncement(a._id))
      load()
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to update announcement.')
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteAnnouncement(deleteTarget._id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete announcement.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetchAnnouncements({
        page: 1, limit: 100,
        search: debouncedSearch || undefined,
        audience: audienceFilter || undefined,
        trigger: triggerFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
      const header = ['Title', 'Type', 'Audience', 'Triggers', 'Status', 'Start Date', 'End Date', 'Views', 'Clicks']
      const rows = res.data.announcements.map((a) => [
        a.title, TYPE_META[a.type].label, AUDIENCE_META[a.targetAudience].label,
        a.triggers.map((t) => TRIGGER_META[t].label).join('; '),
        STATUS_META[a.status].label, a.startDate, a.endDate, String(a.views), String(a.clicks),
      ])
      const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `tumwa-announcements-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Failed to export announcements.')
    }
  }

  const clearFilters = () => { setSearch(''); setAudienceFilter(''); setTriggerFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo('') }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Announcements</h1>
          <p className="mt-0.5 text-sm text-gray-500">Create and manage in-app modals, banners and bottom sheets.</p>
        </div>
        <button
          onClick={() => setComposer({ mode: 'create' })}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New Announcement
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AnnouncementStatus | '')}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value as AnnouncementAudience | '')}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All Audiences</option>
            {Object.entries(AUDIENCE_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value as AnnouncementTrigger | '')}
            className="appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-3 pr-8 text-xs font-semibold text-gray-700 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="">All Triggers</option>
            {Object.entries(TRIGGER_META).map(([value, meta]) => (
              <option key={value} value={value}>{meta.label}</option>
            ))}
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
          <button onClick={load} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Title</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Type</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Audience</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Trigger</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Start</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">End</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Views</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Clicks</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 10 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    {!hasActiveFilters ? (
                      <EmptyState title="No announcements found" sub="Get started by creating your first in-app announcement." onCreate={() => setComposer({ mode: 'create' })} />
                    ) : statusFilter === 'draft' ? (
                      <EmptyState title="No drafts" sub="Announcements you save without activating will show up here." />
                    ) : statusFilter === 'scheduled' ? (
                      <EmptyState title="No scheduled announcements" sub="Schedule one for a future start date and it will appear here." />
                    ) : (
                      <EmptyState title="No announcements match your filters" sub="Try adjusting your search or filters." />
                    )}
                  </td>
                </tr>
              ) : announcements.map((a) => {
                const AudIcon = AUDIENCE_META[a.targetAudience].icon
                return (
                  <tr key={a._id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="max-w-[220px] truncate text-sm font-semibold text-gray-900">{a.title}</p>
                      {a.subtitle && <p className="max-w-[220px] truncate text-xs text-gray-400">{a.subtitle}</p>}
                    </td>
                    <td className="px-5 py-4"><TypeBadge type={a.type} /></td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                        <AudIcon className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
                        {AUDIENCE_META[a.targetAudience].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {a.triggers.slice(0, 2).map((t) => (
                          <span key={t} className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 whitespace-nowrap">
                            {TRIGGER_META[t].label}
                          </span>
                        ))}
                        {a.triggers.length > 2 && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                            +{a.triggers.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={a.status} /></td>
                    <td className="px-5 py-4"><p className="whitespace-nowrap text-sm text-gray-700">{fmtDateTime(a.startDate)}</p></td>
                    <td className="px-5 py-4"><p className="whitespace-nowrap text-sm text-gray-700">{fmtDateTime(a.endDate)}</p></td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <Eye className="h-3.5 w-3.5 text-gray-400" /> {a.views.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1 text-sm text-gray-700">
                        <MousePointerClick className="h-3.5 w-3.5 text-gray-400" /> {a.clicks.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === a._id ? null : a._id)}
                          disabled={busyId === a._id}
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        {openMenuId === a._id && (
                          <RowMenu
                            announcement={a}
                            onView={() => { setOpenMenuId(null); navigate(`/announcements/${a._id}`) }}
                            onEdit={() => handleEdit(a)}
                            onDuplicate={() => handleDuplicate(a)}
                            onDelete={() => { setOpenMenuId(null); setDeleteTarget(a) }}
                            onToggleActive={() => handleToggleActive(a)}
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

        {!loading && pagination.totalPages > 1 && announcements.length > 0 && (
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

      {composer && (
        <AnnouncementComposer
          mode={composer.mode}
          initial={composer.mode === 'edit' ? composer.announcement : undefined}
          onClose={() => setComposer(null)}
          onSaved={handleComposerSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          announcement={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  )
}

// Re-export so other files (Detail page) can use the same badge styling
export { TYPE_META, STATUS_META, StatusBadge, TypeBadge }
