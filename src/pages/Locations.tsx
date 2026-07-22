import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  MapPin, CheckCircle2, XCircle, Search, Plus, Pencil, MoreVertical,
  Download, ChevronDown, Info, ChevronLeft, ChevronRight, X, Calendar,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
} from 'recharts'
import { fetchErrandAnalytics, fetchServiceAreas, createServiceArea, updateServiceArea, deleteServiceArea } from '../services/api'
import type { ErrandAnalytics, ServiceArea, ZoneStatus } from '../types'
import type { LayoutOutletContext } from '../layouts/AdminLayout'

const GREEN = '#248249'
const GRAY = '#d1d5db'

type Tab = 'overview' | 'manage'

const PERIOD_OPTIONS = [
  { label: 'Last 7 days',    value: 'week' },
  { label: 'Last 30 days',   value: 'month' },
  { label: 'Last 3 months',  value: 'quarter' },
  { label: 'Last 12 months', value: 'year' },
] as const

const STATUS_META: Record<ZoneStatus, { label: string; dot: string; className: string }> = {
  active:   { label: 'Active',   dot: 'bg-green-500', className: 'bg-green-50 text-green-700' },
  inactive: { label: 'Inactive', dot: 'bg-amber-400', className: 'bg-amber-50 text-amber-700' },
  retired:  { label: 'Retired',  dot: 'bg-gray-400',  className: 'bg-gray-100 text-gray-500' },
}

const PAGE_SIZE = 10

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

const fmtCount = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)}K` : String(n))
const fmtAxisTick = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n))

const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`

// ── Shared bits ───────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 ${className}`}>
      {children}
    </div>
  )
}

function StatusBadge({ status }: { status: ZoneStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${meta.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

function StatRow({
  icon: Icon, iconBg, iconColor, label, value, sub,
}: {
  icon: typeof MapPin
  iconBg: string
  iconColor: string
  label: string
  value: number
  sub: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-gray-50 py-3 last:border-0">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

function PeriodDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const current = PERIOD_OPTIONS.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        <Calendar className="h-3.5 w-3.5 text-gray-400" />
        {current?.label}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                className={`block w-full px-3 py-2 text-left text-xs font-medium transition-colors ${
                  opt.value === value ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Row action menu ───────────────────────────────────────────────────────────

function RowMenu({
  area, onStatusChange, onDelete, onClose,
}: {
  area: ServiceArea
  onStatusChange: (status: ZoneStatus) => void
  onDelete: () => void
  onClose: () => void
}) {
  const statusActions: Array<{ status: ZoneStatus; label: string }> = [
    { status: 'active', label: 'Activate' },
    { status: 'inactive', label: 'Deactivate' },
    { status: 'retired', label: 'Retire' },
  ]

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
        {statusActions
          .filter((a) => a.status !== area.status)
          .map((a) => (
            <button
              key={a.status}
              onClick={() => onStatusChange(a.status)}
              className="block w-full px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {a.label}
            </button>
          ))}
        <div className="my-1 border-t border-gray-100" />
        <button
          onClick={onDelete}
          className="block w-full px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </>
  )
}

// ── Add/Edit zone modal ───────────────────────────────────────────────────────

function ZoneFormModal({
  mode, area, onClose, onSaved,
}: {
  mode: 'add' | 'edit'
  area?: ServiceArea
  onClose: () => void
  onSaved: (area: ServiceArea) => void
}) {
  const [name, setName] = useState(area?.name ?? '')
  const [region, setRegion] = useState(area?.region ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Zone name is required'); return }
    setSaving(true)
    setError('')
    try {
      const saved = mode === 'add'
        ? await createServiceArea({ name: name.trim(), region: region.trim() })
        : await updateServiceArea(area!._id, { name: name.trim(), region: region.trim() })
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save zone.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">{mode === 'add' ? 'Add New Zone' : 'Edit Zone'}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Zone Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Nakuru Town"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="e.g. Nakuru County"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-5 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
          >
            {saving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            {mode === 'add' ? 'Add Zone' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  area, onConfirm, onCancel, loading, error,
}: {
  area: ServiceArea
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
  error: string
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900">Delete Zone?</h3>
        <p className="mt-1 text-sm text-gray-500">
          This will permanently delete <span className="font-semibold text-gray-700">{area.name}</span>.
          If you just want to stop offering service there, use <span className="font-semibold text-gray-700">Retire</span> instead so its history stays intact.
        </p>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
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
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Locations page ────────────────────────────────────────────────────────────

export default function Locations() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const [tab, setTab] = useState<Tab>('overview')

  useEffect(() => {
    setSubtitle('Analytics and management of service/coverage areas.')
  }, [setSubtitle])

  // Top-locations chart
  const [period, setPeriod] = useState<string>('week')
  const [locationField, setLocationField] = useState<'pickup' | 'delivery'>('pickup')
  const [analytics, setAnalytics] = useState<ErrandAnalytics | null>(null)
  const [chartLoading, setChartLoading] = useState(true)

  useEffect(() => {
    setChartLoading(true)
    fetchErrandAnalytics(period, locationField)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setChartLoading(false))
  }, [period, locationField])

  // "Other" is the overflow bucket for addresses that don't match a known
  // zone — kept visible (styled distinctly below) rather than hidden, since
  // hiding it can make the chart go empty even when real demand exists.
  const topLocations = analytics?.charts.topLocations.data ?? []

  // Zones
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [areasLoading, setAreasLoading] = useState(true)
  const [areasError, setAreasError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const loadAreas = useCallback(() => {
    setAreasLoading(true)
    setAreasError('')
    fetchServiceAreas()
      .then(setAreas)
      .catch((err: Error) => setAreasError(err.message))
      .finally(() => setAreasLoading(false))
  }, [])

  useEffect(() => { loadAreas() }, [loadAreas])
  useEffect(() => { setPage(1) }, [search])

  const totalZones = areas.length
  const activeZones = areas.filter((a) => a.status === 'active').length
  const retiredZones = areas.filter((a) => a.status === 'retired').length

  // Highest-demand zones first, mirroring the chart above
  const sortedAreas = useMemo(
    () => [...areas].sort((a, b) => (b.errandCount7d ?? 0) - (a.errandCount7d ?? 0)),
    [areas],
  )

  const filteredAreas = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return sortedAreas
    return sortedAreas.filter((a) => a.name.toLowerCase().includes(q) || a.region.toLowerCase().includes(q))
  }, [sortedAreas, search])

  const totalPages = Math.max(1, Math.ceil(filteredAreas.length / PAGE_SIZE))
  const pagedAreas = filteredAreas.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Row menus / modals
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formModal, setFormModal] = useState<{ mode: 'add' | 'edit'; area?: ServiceArea } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServiceArea | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const handleSaved = (saved: ServiceArea) => {
    setAreas((prev) => {
      const exists = prev.some((a) => a._id === saved._id)
      return exists ? prev.map((a) => (a._id === saved._id ? { ...a, ...saved } : a)) : [...prev, { ...saved, errandCount7d: 0 }]
    })
    setFormModal(null)
  }

  const handleStatusChange = async (area: ServiceArea, status: ZoneStatus) => {
    setBusyId(area._id)
    setOpenMenuId(null)
    try {
      const updated = await updateServiceArea(area._id, { status })
      setAreas((prev) => prev.map((a) => (a._id === updated._id ? { ...a, ...updated } : a)))
    } catch {
      // Ignore — row stays as-is, admin can retry from the menu
    } finally {
      setBusyId(null)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    setDeleteError('')
    try {
      await deleteServiceArea(deleteTarget._id)
      setAreas((prev) => prev.filter((a) => a._id !== deleteTarget._id))
      setDeleteTarget(null)
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete zone.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleExport = () => {
    const header = ['Zone Name', 'Region', 'Status', 'Errands (Last 7 Days)', 'Created On']
    const rows = filteredAreas.map((a) => [
      a.name,
      a.region || '',
      STATUS_META[a.status].label,
      String(a.errandCount7d ?? 0),
      fmtDate(a.createdAt),
    ])
    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `tumwa-service-areas-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Tabs + toolbar — same row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100">
        {/* Tabs */}
        <div className="flex gap-6">
          <button
            onClick={() => setTab('overview')}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === 'overview' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('manage')}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              tab === 'manage' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Zones
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 pb-3">
          <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
            {(['pickup', 'delivery'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setLocationField(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  locationField === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <PeriodDropdown value={period} onChange={setPeriod} />
          <button
            onClick={handleExport}
            disabled={areas.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            Export
          </button>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Top locations chart */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-gray-900">
                Top {locationField === 'pickup' ? 'Pickup' : 'Delivery'} Locations by Errand Volume
              </h3>
              <span title={`${locationField === 'pickup' ? 'Pickup' : 'Delivery'} addresses are matched against your zone list and grouped into whichever zone they mention.`}>
                <Info className="h-3.5 w-3.5 text-gray-300" />
              </span>
            </div>

            <div className="mt-4 h-72">
              {chartLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">Loading…</div>
              ) : topLocations.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No errand location data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topLocations} margin={{ top: 24, left: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={fmtAxisTick}
                      label={{ value: 'Errands', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#9ca3af' } }}
                    />
                    <Tooltip
                      formatter={(value, name) => (name === 'count' ? [value, 'Errands'] : [value, name])}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {topLocations.map((d) => (
                        <Cell key={d.label} fill={d.label === 'Other' ? GRAY : GREEN} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        formatter={(v: React.ReactNode) => (typeof v === 'number' ? fmtCount(v) : v)}
                        style={{ fontSize: 11, fontWeight: 600, fill: '#6b7280' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Coverage summary */}
          <Card>
            <h3 className="text-sm font-bold text-gray-900">Coverage Summary</h3>
            <div className="mt-2">
              <StatRow icon={MapPin} iconBg="bg-green-50" iconColor="text-green-600" label="Total Zones" value={totalZones} sub="All service areas" />
              <StatRow icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" label="Active Zones" value={activeZones} sub="Currently accepting errands" />
              <StatRow icon={XCircle} iconBg="bg-orange-50" iconColor="text-orange-500" label="Retired Zones" value={retiredZones} sub="No longer in service" />
            </div>
            <button onClick={() => setTab('manage')} className="mt-3 text-xs font-semibold text-primary-600 hover:underline">
              View all zones →
            </button>
          </Card>
        </div>
      )}

      <Card>
        <h3 className="text-sm font-bold text-gray-900">Service / Coverage Areas</h3>

        {/* Search + add */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search zones..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <button
            onClick={() => setFormModal({ mode: 'add' })}
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add New Zone
          </button>
        </div>

        {areasError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
            {areasError}
            <button onClick={loadAreas} className="ml-auto font-semibold underline">Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Zone Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Region</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Errands (Last 7 Days)</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Created On</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {areasLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : pagedAreas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    {areas.length === 0 ? 'No service areas yet — add one to get started.' : 'No zones match your search.'}
                  </td>
                </tr>
              ) : (
                pagedAreas.map((area) => (
                  <tr key={area._id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                      <div className="flex items-center gap-2">
                        {area.name}
                        {area.autoDetected && (
                          <span
                            title="Auto-detected from a customer's order — not yet reviewed by an admin"
                            className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-semibold text-primary-600"
                          >
                            New
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{area.region || '—'}</td>
                    <td className="px-5 py-4"><StatusBadge status={area.status} /></td>
                    <td className="px-5 py-4 text-sm text-gray-700">{(area.errandCount7d ?? 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDate(area.createdAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFormModal({ mode: 'edit', area })}
                          title="Edit zone"
                          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                        >
                          <Pencil className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === area._id ? null : area._id)}
                            disabled={busyId === area._id}
                            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                          >
                            <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                          {openMenuId === area._id && (
                            <RowMenu
                              area={area}
                              onStatusChange={(status) => handleStatusChange(area, status)}
                              onDelete={() => { setOpenMenuId(null); setDeleteTarget(area) }}
                              onClose={() => setOpenMenuId(null)}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!areasLoading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-1 border-t border-gray-100 pt-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`h-8 w-8 rounded-lg text-xs font-semibold transition ${
                  n === page ? 'bg-primary-600 text-white' : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-50 disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </Card>

      {formModal && (
        <ZoneFormModal
          mode={formModal.mode}
          area={formModal.area}
          onClose={() => setFormModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          area={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeleteTarget(null); setDeleteError('') }}
          loading={deleteLoading}
          error={deleteError}
        />
      )}
    </div>
  )
}
