import { useCallback, useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import { FileText, FileSpreadsheet, FileDown, Trash2, X, Plus } from 'lucide-react'
import {
  fetchGeneratedReports,
  generateReport,
  downloadReport,
  deleteReport,
  fetchServiceAreas,
} from '../services/api'
import type { GeneratedReport, ReportType, ReportFormat, ServiceArea } from '../types'
import Card from '../components/Card'
import Dropdown from '../components/Dropdown'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// ── Report templates ──────────────────────────────────────────────────────────

const REPORT_TEMPLATES: Array<{ type: ReportType; label: string; description: string; disabled?: boolean }> = [
  { type: 'revenue', label: 'Revenue Report', description: 'Revenue, commission, escrow, refunds, and withdrawals for the selected period.' },
  { type: 'finance', label: 'Finance Report', description: 'A full financial breakdown across every payment type.' },
  { type: 'transactions', label: 'Transactions Report', description: 'Every M-Pesa transaction — payments, withdrawals, refunds, and wallet credits.' },
  { type: 'customer_activity', label: 'Customer Activity Report', description: 'New vs. returning customers, total spend, and completed errands.' },
  { type: 'runner_performance', label: 'Runner Performance Report', description: 'Rating, completion/cancellation rate, working capital limit, and earnings per runner.' },
  { type: 'errands', label: 'Errands Report', description: 'Created, assigned, completed, and cancelled errands with average completion time.' },
  { type: 'verification', label: 'Verification Report', description: 'Pending, approved, and rejected identity verifications with average review time.' },
  { type: 'withdrawals', label: 'Withdrawals Report', description: 'Completed, pending, and failed runner withdrawals.' },
  { type: 'disputes', label: 'Disputes Report', description: 'Open and resolved disputes, refund amounts, and resolution time.' },
  { type: 'locations', label: 'Locations Report', description: 'Top regions, revenue by region, and errand volume trends.' },
  {
    type: 'promo_codes',
    label: 'Promo Codes Report',
    description: 'Available once the Promo Codes feature launches.',
    disabled: true,
  },
]

const FORMAT_OPTIONS: Array<{ value: ReportFormat; label: string; icon: typeof FileText }> = [
  { value: 'pdf', label: 'PDF', icon: FileText },
  { value: 'xlsx', label: 'Excel', icon: FileSpreadsheet },
  { value: 'csv', label: 'CSV', icon: FileDown },
]

const STATUS_META: Record<GeneratedReport['status'], { label: string; className: string }> = {
  generating: { label: 'Generating', className: 'bg-amber-50 text-amber-700' },
  completed: { label: 'Completed', className: 'bg-green-50 text-green-700' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-600' },
}

// ── Report generator modal ────────────────────────────────────────────────────

function GeneratorModal({
  initialType,
  areas,
  onClose,
  onGenerated,
}: {
  initialType: ReportType
  areas: ServiceArea[]
  onClose: () => void
  onGenerated: () => void
}) {
  const [type, setType] = useState<ReportType>(initialType)
  const [format, setFormat] = useState<ReportFormat>('pdf')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [location, setLocation] = useState('')
  const [customer, setCustomer] = useState('')
  const [runner, setRunner] = useState('')
  const [status, setStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const template = REPORT_TEMPLATES.find((t) => t.type === type)
  const showLocation = ['locations', 'errands', 'revenue', 'finance'].includes(type)
  const showCustomer = ['customer_activity', 'errands', 'transactions', 'disputes'].includes(type)
  const showRunner = ['runner_performance', 'errands', 'transactions', 'withdrawals', 'disputes'].includes(type)
  const showStatus = ['errands', 'disputes', 'verification', 'withdrawals', 'transactions'].includes(type)

  const handleSubmit = () => {
    setSubmitting(true)
    setError('')
    generateReport({
      type,
      format,
      filters: {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        location: location || undefined,
        customer: customer || undefined,
        runner: runner || undefined,
        status: status || undefined,
      },
    })
      .then(() => {
        onGenerated()
        onClose()
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Generate Report</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500">Report Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {REPORT_TEMPLATES.filter((t) => !t.disabled).map((t) => (
                <option key={t.type} value={t.type}>{t.label}</option>
              ))}
            </select>
          </div>

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

          {showLocation && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Location</label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">All Locations</option>
                {areas.map((a) => (
                  <option key={a._id} value={a.name}>{a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {showCustomer && (
              <div>
                <label className="text-xs font-semibold text-gray-500">Customer ID</label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            )}
            {showRunner && (
              <div>
                <label className="text-xs font-semibold text-gray-500">Runner ID</label>
                <input
                  value={runner}
                  onChange={(e) => setRunner(e.target.value)}
                  placeholder="Optional"
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            )}
          </div>

          {showStatus && (
            <div>
              <label className="text-xs font-semibold text-gray-500">Status</label>
              <input
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Optional — e.g. completed, pending"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-500">File Format</label>
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
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Generating…' : `Generate ${template?.label ?? ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reports page ──────────────────────────────────────────────────────────────

const LIMIT = 20

export default function Reports() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()

  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [lastGenerated, setLastGenerated] = useState<Partial<Record<ReportType, GeneratedReport>>>({})

  const [reports, setReports] = useState<GeneratedReport[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')

  const [modalType, setModalType] = useState<ReportType | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    setSubtitle('Generate operational and financial reports.')
  }, [setSubtitle])

  useEffect(() => {
    fetchServiceAreas().then(setAreas).catch(() => {})
  }, [])

  // One request for the most recent reports across every type, rather than
  // one request per template — the list is already sorted newest-first, so
  // the first occurrence of each type is that type's "last generated".
  // Fanning this out per-type used to cost ~10 admin-rate-limited requests
  // on every page load and every generate action.
  const loadLastGenerated = useCallback(() => {
    fetchGeneratedReports({ limit: 100 })
      .then((res) => {
        const latest: Partial<Record<ReportType, GeneratedReport>> = {}
        res.data.reports.forEach((r) => {
          if (!latest[r.type]) latest[r.type] = r
        })
        setLastGenerated(latest)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadLastGenerated()
  }, [loadLastGenerated])

  const loadTable = useCallback((p: number, type: string) => {
    setLoading(true)
    setError('')
    fetchGeneratedReports({ page: p, limit: LIMIT, type: (type || undefined) as ReportType | undefined })
      .then((res) => {
        setReports(res.data.reports)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadTable(page, typeFilter)
  }, [page, typeFilter, loadTable])

  const handleGenerated = () => {
    loadLastGenerated()
    loadTable(1, typeFilter)
    setPage(1)
  }

  const handleDownload = (report: GeneratedReport) => {
    downloadReport(report._id)
      .then((url) => window.open(url, '_blank'))
      .catch(() => {})
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this report? This cannot be undone.')) return
    setDeletingId(id)
    deleteReport(id)
      .then(() => loadTable(page, typeFilter))
      .finally(() => setDeletingId(null))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setModalType('revenue')}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Generate Report
        </button>
      </div>

      {/* Report templates */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {REPORT_TEMPLATES.map((t) => {
          const last = lastGenerated[t.type]
          return (
            <Card key={t.type} className={t.disabled ? 'opacity-60' : ''}>
              <h3 className="text-sm font-bold text-gray-900">{t.label}</h3>
              <p className="mt-1.5 text-xs text-gray-500">{t.description}</p>
              <p className="mt-3 text-[11px] text-gray-400">
                Last generated: {last ? fmtDateTime(last.generatedAt) : '—'}
              </p>
              <button
                onClick={() => !t.disabled && setModalType(t.type)}
                disabled={t.disabled}
                title={t.disabled ? 'Available once Promo Codes launches' : undefined}
                className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Generate
              </button>
            </Card>
          )
        })}
      </div>

      {/* Generated reports table */}
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown
          value={typeFilter || '__all__'}
          options={[
            { value: '__all__', label: 'All Types' },
            ...REPORT_TEMPLATES.filter((t) => !t.disabled).map((t) => ({ value: t.type, label: t.label })),
          ]}
          onChange={(v) => {
            setTypeFilter(v === '__all__' ? '' : v)
            setPage(1)
          }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button onClick={() => loadTable(page, typeFilter)} className="ml-auto text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Report Name</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Generated By</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Generated On</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Format</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Status</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <p className="text-sm font-medium text-gray-400">No reports generated yet</p>
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r._id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{r.generatedBy?.name ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmtDateTime(r.generatedAt)}</td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-600">{r.fileFormat}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[r.status].className}`}>
                        {STATUS_META[r.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDownload(r)}
                          disabled={r.status !== 'completed'}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 disabled:opacity-30"
                          title="Download"
                        >
                          <FileDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r._id)}
                          disabled={deletingId === r._id}
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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

      {modalType && (
        <GeneratorModal
          initialType={modalType}
          areas={areas}
          onClose={() => setModalType(null)}
          onGenerated={handleGenerated}
        />
      )}
    </div>
  )
}
