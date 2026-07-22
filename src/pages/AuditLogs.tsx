import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import {
  Download,
  RefreshCw,
  SlidersHorizontal,
  Search,
  X,
  History,
  Table as TableIcon,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Users,
  Footprints,
  ClipboardList,
  Receipt,
  ArrowDownToLine,
  ShieldCheck,
  Wallet,
  Lock,
  AlertTriangle,
  Bell,
  Megaphone,
  MapPin,
  FileBarChart,
  BarChart3,
  Tag,
  Settings,
  UserCog,
  FileText,
  FileSpreadsheet,
  FileDown,
  Inbox,
  type LucideIcon,
} from 'lucide-react'
import {
  fetchAuditLogs,
  fetchAuditLogStats,
  fetchAuditLogSecurityInsights,
  fetchUsers,
  generateReport,
  downloadReport,
} from '../services/api'
import type {
  AuditLogEntry,
  AuditLogStats,
  AuditSecurityInsight,
  AuditModule,
  AuditAction,
  AuditSeverity,
  AdminUser,
  ReportFormat,
} from '../types'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import Dropdown from '../components/Dropdown'

// ── Static enums (mirrors models/AuditLog.js — see backend for the source of truth) ──

const MODULES: AuditModule[] = [
  'Users', 'Runners', 'Errands', 'Transactions', 'Withdrawals', 'Verification',
  'Working Capital', 'Customer Wallet', 'Escrow', 'Disputes', 'Notifications',
  'Announcements', 'Locations', 'Reports', 'Analytics', 'Promo Codes', 'Settings', 'Admin Users',
]

const ACTIONS: AuditAction[] = [
  'Created', 'Updated', 'Deleted', 'Approved', 'Rejected', 'Suspended',
  'Activated', 'Refunded', 'Login', 'Logout', 'Password Reset', 'Settings Changed',
]

const SEVERITIES: AuditSeverity[] = ['Low', 'Medium', 'High', 'Critical']

const MODULE_ICON: Record<AuditModule, LucideIcon> = {
  Users: Users,
  Runners: Footprints,
  Errands: ClipboardList,
  Transactions: Receipt,
  Withdrawals: ArrowDownToLine,
  Verification: ShieldCheck,
  'Working Capital': Wallet,
  'Customer Wallet': Wallet,
  Escrow: Lock,
  Disputes: AlertTriangle,
  Notifications: Bell,
  Announcements: Megaphone,
  Locations: MapPin,
  Reports: FileBarChart,
  Analytics: BarChart3,
  'Promo Codes': Tag,
  Settings: Settings,
  'Admin Users': UserCog,
}

const SEVERITY_META: Record<AuditSeverity, { className: string; dot: string }> = {
  Low: { className: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
  Medium: { className: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  High: { className: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  Critical: { className: 'bg-red-50 text-red-700', dot: 'bg-red-600' },
}

const INSIGHT_SEVERITY_META: Record<AuditSecurityInsight['severity'], string> = {
  low: 'border-blue-100 bg-blue-50/60 text-blue-800',
  medium: 'border-amber-100 bg-amber-50/60 text-amber-800',
  high: 'border-red-100 bg-red-50/60 text-red-800',
}

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

const fmtDayHeading = (d: string) => {
  const date = new Date(d)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'
  return date.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const relativeTime = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return fmtDateTime(iso)
}

const prettifyKey = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).replace(/\./g, ' ')

const renderValue = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

// ── Small badges ──────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: AuditSeverity }) {
  const meta = SEVERITY_META[severity]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {severity}
    </span>
  )
}

function StatusPill({ status }: { status: AuditLogEntry['status'] }) {
  return status === 'success' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      <CheckCircle2 className="h-3 w-3" /> Success
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
      <XCircle className="h-3 w-3" /> Failed
    </span>
  )
}

function ModuleTag({ module }: { module: AuditModule }) {
  const Icon = MODULE_ICON[module] ?? FileBarChart
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
      <Icon className="h-3.5 w-3.5 text-gray-400" strokeWidth={1.75} />
      {module}
    </span>
  )
}

// ── Changes diff renderer ─────────────────────────────────────────────────────

function ChangesView({ changes }: { changes: AuditLogEntry['changes'] }) {
  const before = (changes?.before && typeof changes.before === 'object' ? changes.before : {}) as Record<string, unknown>
  const after = (changes?.after && typeof changes.after === 'object' ? changes.after : {}) as Record<string, unknown>
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]))

  if (!changes || keys.length === 0) {
    return <p className="text-xs text-gray-400">No structured changes recorded for this event.</p>
  }

  return (
    <div className="space-y-2">
      {keys.map((key) => (
        <div key={key} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
          <span className="w-28 shrink-0 font-semibold text-gray-500">{prettifyKey(key)}</span>
          <span className="rounded-md bg-red-50 px-2 py-1 text-red-600 line-through decoration-red-300">
            {renderValue(before?.[key])}
          </span>
          <span className="text-gray-300">&rarr;</span>
          <span className="rounded-md bg-green-50 px-2 py-1 font-semibold text-green-700">
            {renderValue(after?.[key])}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Details drawer ────────────────────────────────────────────────────────────

function DetailsDrawer({ log, onClose }: { log: AuditLogEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">{log.action} &middot; {log.module}</h3>
            <p className="mt-0.5 text-xs text-gray-400 font-mono">{log._id}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 px-6 py-5">
          <div className="flex items-center gap-3">
            <SeverityBadge severity={log.severity} />
            <StatusPill status={log.status} />
          </div>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">General Information</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-500">Event ID:</span> <span className="font-mono">{log._id}</span></p>
              <p><span className="font-semibold text-gray-500">Request ID:</span> <span className="font-mono">{log.requestId ?? '—'}</span></p>
              <p><span className="font-semibold text-gray-500">Date &amp; Time:</span> {fmtDateTime(log.createdAt)}</p>
              <p><span className="font-semibold text-gray-500">Module:</span> {log.module}</p>
              <p><span className="font-semibold text-gray-500">Action:</span> {log.action}</p>
              <p><span className="font-semibold text-gray-500">Severity:</span> {log.severity}</p>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Administrator</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-500">Name:</span> {log.actor.name}</p>
              <p><span className="font-semibold text-gray-500">Role:</span> <span className="capitalize">{log.actor.role}</span></p>
              <p><span className="font-semibold text-gray-500">Email:</span> {log.actor.email ?? '—'}</p>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Target</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-500">Affected:</span> {log.target?.type ?? '—'} {log.target?.label ? `— ${log.target.label}` : ''}</p>
              <p><span className="font-semibold text-gray-500">Record ID:</span> <span className="font-mono">{log.target?.id ?? '—'}</span></p>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Changes</p>
            <ChangesView changes={log.changes} />
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Reason / Notes</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
              {log.reason || <span className="text-gray-400">No notes were entered for this event.</span>}
            </div>
            {log.status === 'failed' && log.errorMessage && (
              <p className="mt-2 text-xs text-red-600">Error: {log.errorMessage}</p>
            )}
          </section>

          <section>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Technical Information</p>
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-1 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-500">IP Address:</span> {log.ip ?? '—'}</p>
              <p><span className="font-semibold text-gray-500">Browser:</span> {log.device?.browser ?? '—'}</p>
              <p><span className="font-semibold text-gray-500">Operating System:</span> {log.device?.os ?? '—'}</p>
              <p><span className="font-semibold text-gray-500">Device:</span> {log.device?.device ?? '—'}</p>
              <p><span className="font-semibold text-gray-500">Session ID:</span> <span className="font-mono">{log.sessionId ?? '—'}</span></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

// ── Export modal ──────────────────────────────────────────────────────────────

const FORMAT_OPTIONS: Array<{ value: ReportFormat; label: string; icon: typeof FileText }> = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileDown },
]

function ExportModal({
  admins,
  onClose,
}: {
  admins: AdminUser[]
  onClose: () => void
}) {
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [module, setModule] = useState('')
  const [severity, setSeverity] = useState('')
  const [adminId, setAdminId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = () => {
    setSubmitting(true)
    setError('')
    setSuccess('')
    generateReport({
      type: 'audit_logs',
      format,
      filters: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        module: module || undefined,
        severity: severity || undefined,
        adminId: adminId || undefined,
      },
    })
      .then((report) => {
        if (report.status === 'completed') {
          return downloadReport(report._id).then((url) => {
            window.open(url, '_blank')
            setSuccess('Export ready — download started.')
          })
        }
        setError(report.errorMessage || 'Export failed. Please try again.')
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Export Audit Logs</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500">Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">All Modules</option>
                {MODULES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">All Severities</option>
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Admin</label>
            <select
              value={adminId}
              onChange={(e) => setAdminId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">All Admins</option>
              {admins.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500">Export Format</label>
            <div className="mt-1 flex gap-2 rounded-xl bg-gray-100 p-1">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      format === opt.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
          {success && <p className="text-xs text-green-700">{success}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">
            Close
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Audit Logs page ───────────────────────────────────────────────────────────

const LIMIT = 25

export default function AuditLogs() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()

  const [view, setView] = useState<'table' | 'timeline'>('table')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null)

  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [stats, setStats] = useState<AuditLogStats | null>(null)
  const [insights, setInsights] = useState<AuditSecurityInsight[]>([])
  const [admins, setAdmins] = useState<AdminUser[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [module, setModule] = useState('')
  const [action, setAction] = useState('')
  const [severity, setSeverity] = useState('')
  const [adminId, setAdminId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    setSubtitle('Monitor and review all administrative actions across the platform.')
  }, [setSubtitle])

  useEffect(() => {
    Promise.all([
      fetchUsers({ role: 'admin', limit: 100 }),
      fetchUsers({ role: 'superadmin', limit: 100 }),
    ])
      .then(([a, b]) => setAdmins([...a.data.users, ...b.data.users]))
      .catch(() => {})
  }, [])

  // Debounce free-text search so every keystroke doesn't fire a request
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const query = useMemo(
    () => ({
      search,
      module: module as AuditModule | '',
      action: action as AuditAction | '',
      severity: severity as AuditSeverity | '',
      adminId,
      dateFrom,
      dateTo,
    }),
    [search, module, action, severity, adminId, dateFrom, dateTo],
  )

  const loadTable = useCallback((p: number) => {
    setLoading(true)
    setError('')
    fetchAuditLogs({ ...query, page: p, limit: LIMIT })
      .then((res) => {
        setLogs(res.data.logs)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [query])

  const loadSidebar = useCallback(() => {
    fetchAuditLogStats({ dateFrom, dateTo }).then(setStats).catch(() => {})
    fetchAuditLogSecurityInsights().then(setInsights).catch(() => {})
  }, [dateFrom, dateTo])

  useEffect(() => { loadTable(page) }, [page, loadTable])
  useEffect(() => { loadSidebar() }, [loadSidebar])

  const handleRefresh = () => {
    loadTable(page)
    loadSidebar()
  }

  const hasActiveFilters = !!(search || module || action || severity || adminId || dateFrom || dateTo)

  const handleReset = () => {
    setSearchInput('')
    setSearch('')
    setModule('')
    setAction('')
    setSeverity('')
    setAdminId('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const grouped = useMemo(() => {
    const map = new Map<string, AuditLogEntry[]>()
    logs.forEach((log) => {
      const key = new Date(log.createdAt).toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(log)
    })
    return Array.from(map.entries())
  }, [logs])

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export Logs
        </button>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
            showAdvanced ? 'bg-primary-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Advanced Filters
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Events" value={stats?.totalEvents ?? '—'} icon={ClipboardList} iconBg="bg-gray-100" iconColor="text-gray-600" />
        <StatCard label="Events Today" value={stats?.eventsToday ?? '—'} icon={History} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="High Risk Events" value={stats?.highRiskEvents ?? '—'} icon={ShieldAlert} iconBg="bg-red-50" iconColor="text-red-600" />
        <StatCard label="Failed Actions" value={stats?.failedActions ?? '—'} icon={XCircle} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard
          label="Most Active Admin"
          value={stats?.mostActiveAdmin?.name ?? '—'}
          sub={stats?.mostActiveAdmin ? `${stats.mostActiveAdmin.count} actions` : undefined}
          icon={UserCog}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
        />
      </div>

      {/* Search & filters */}
      <div className="sticky top-0 z-10 -mx-1 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by admin, target, action, request ID or reference…"
              className="w-full rounded-xl border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <Dropdown
            value={module || '__all__'}
            options={[{ value: '__all__', label: 'All Modules' }, ...MODULES.map((m) => ({ value: m, label: m }))]}
            onChange={(v) => { setModule(v === '__all__' ? '' : v); setPage(1) }}
          />
          <Dropdown
            value={severity || '__all__'}
            options={[{ value: '__all__', label: 'All Severities' }, ...SEVERITIES.map((s) => ({ value: s, label: s }))]}
            onChange={(v) => { setSeverity(v === '__all__' ? '' : v); setPage(1) }}
          />

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />

          {hasActiveFilters && (
            <button onClick={handleReset} className="text-xs font-semibold text-gray-500 underline hover:text-gray-700">
              Reset Filters
            </button>
          )}

          <div className="ml-auto flex gap-1 rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => setView('table')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <TableIcon className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView('timeline')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                view === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
            <Dropdown
              value={action || '__all__'}
              options={[{ value: '__all__', label: 'All Actions' }, ...ACTIONS.map((a) => ({ value: a, label: a }))]}
              onChange={(v) => { setAction(v === '__all__' ? '' : v); setPage(1) }}
            />
            <Dropdown
              value={adminId || '__all__'}
              options={[{ value: '__all__', label: 'All Admins' }, ...admins.map((a) => ({ value: a._id, label: a.name }))]}
              onChange={(v) => { setAdminId(v === '__all__' ? '' : v); setPage(1) }}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => loadTable(page)} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Table view */}
      {view === 'table' && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Time</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Admin</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Module</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Action</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Target</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Severity</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">IP Address</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                      ))}
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <Inbox className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-3 text-sm font-medium text-gray-400">
                        {hasActiveFilters ? 'No results matching filters' : 'No audit logs recorded yet'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {hasActiveFilters ? 'Try widening your search or clearing filters.' : 'Administrative actions will appear here as they happen.'}
                      </p>
                      {hasActiveFilters && (
                        <button onClick={handleReset} className="mt-3 text-xs font-semibold text-primary-600 underline">
                          Reset Filters
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedLog(log)}
                      className="cursor-pointer transition-colors hover:bg-gray-50/50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-gray-500" title={fmtDateTime(log.createdAt)}>
                        {relativeTime(log.createdAt)}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-gray-900">{log.actor.name}</p>
                        <p className="text-xs capitalize text-gray-400">{log.actor.role}</p>
                      </td>
                      <td className="px-5 py-4"><ModuleTag module={log.module} /></td>
                      <td className="px-5 py-4 text-sm text-gray-700">{log.action}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{log.target?.label ?? '—'}</td>
                      <td className="px-5 py-4"><SeverityBadge severity={log.severity} /></td>
                      <td className="px-5 py-4 font-mono text-xs text-gray-500">{log.ip ?? '—'}</td>
                      <td className="px-5 py-4"><StatusPill status={log.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log) }}
                          className="text-xs font-semibold text-primary-600 hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

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
      )}

      {/* Timeline view */}
      {view === 'timeline' && (
        <Card>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)}
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="mx-auto h-8 w-8 text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-400">
                {hasActiveFilters ? 'No results matching filters' : 'No audit logs recorded yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(([day, entries]) => (
                <div key={day}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-400">{fmtDayHeading(entries[0].createdAt)}</p>
                  <ol className="relative space-y-5 border-l border-gray-200 pl-5">
                    {entries.map((log) => (
                      <li key={log._id} className="relative">
                        <span className={`absolute -left-[25px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white ${SEVERITY_META[log.severity].dot}`} />
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="w-full rounded-xl px-3 py-2 text-left transition-colors hover:bg-gray-50"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-gray-400" title={fmtDateTime(log.createdAt)}>
                              {new Date(log.createdAt).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm font-semibold text-gray-900">{log.actor.name}</span>
                            <span className="text-sm text-gray-500">{log.action.toLowerCase()}</span>
                            <ModuleTag module={log.module} />
                            {log.target?.label && <span className="text-sm text-gray-400">&middot; {log.target.label}</span>}
                            <SeverityBadge severity={log.severity} />
                            {log.status === 'failed' && <StatusPill status="failed" />}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Security insights */}
      <div>
        <h3 className="mb-3 text-sm font-bold text-gray-900">Security Insights</h3>
        {insights.length === 0 ? (
          <Card className="flex items-center gap-3 text-sm text-gray-500">
            <ShieldCheck className="h-5 w-5 text-green-500" />
            No unusual administrative activity detected.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {insights.map((insight) => (
              <div key={insight.id} className={`rounded-2xl border p-4 ${INSIGHT_SEVERITY_META[insight.severity]}`}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <p className="text-sm font-semibold">{insight.title}</p>
                </div>
                <p className="mt-1.5 text-xs opacity-90">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedLog && <DetailsDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />}
      {showExportModal && <ExportModal admins={admins} onClose={() => setShowExportModal(false)} />}
    </div>
  )
}
