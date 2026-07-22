import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { Eye } from 'lucide-react'
import { fetchVerificationsQueue } from '../services/api'
import type { VerificationQueueItem, VerificationStatus } from '../types'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import VerificationBadge from '../components/VerificationBadge'

const fmt = (d: string) =>
  new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })

const TABS: Array<{ label: string; value: VerificationStatus | '' }> = [
  { label: 'Pending',                 value: 'pending' },
  { label: 'Approved',                value: 'approved' },
  { label: 'Rejected',                value: 'rejected' },
  { label: 'Resubmission Requested',  value: 'resubmission_requested' },
]

const LIMIT = 20

function DocThumb({ url }: { url: string | null | undefined }) {
  if (!url) {
    return <div className="h-9 w-9 shrink-0 rounded-lg border border-dashed border-gray-200 bg-gray-50" />
  }
  return (
    <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover" />
  )
}

export default function IdentityVerification() {
  const navigate = useNavigate()
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()

  const [tab, setTab] = useState<VerificationStatus>('pending')
  const [items, setItems] = useState<VerificationQueueItem[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback((status: VerificationStatus, p: number) => {
    setLoading(true)
    setError('')
    fetchVerificationsQueue({ status, page: p, limit: LIMIT })
      .then((res) => {
        setItems(res.data.verifications)
        setPagination({ total: res.pagination.total, page: res.pagination.page, totalPages: res.pagination.totalPages })
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(tab, page) }, [tab, page, load])

  useEffect(() => {
    setSubtitle(pagination.total > 0 ? `${pagination.total} ${TABS.find((t) => t.value === tab)?.label.toLowerCase()} requests` : 'Runner identity verification review queue')
  }, [pagination.total, tab, setSubtitle])

  const handleTabChange = (v: VerificationStatus) => { setTab(v); setPage(1) }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex flex-wrap rounded-xl bg-gray-100 p-1 gap-1">
        {TABS.map(({ label, value }) => (
          <button
            key={label}
            onClick={() => handleTabChange(value as VerificationStatus)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button onClick={() => load(tab, page)} className="ml-auto text-xs font-semibold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Runner</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phone</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Submitted</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Documents</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-4 animate-pulse rounded bg-gray-100" /></td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-sm text-gray-400">
                    No {TABS.find((t) => t.value === tab)?.label.toLowerCase()} requests.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-600">
                          {item.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                        <p className="truncate text-sm font-semibold text-gray-900">{item.user?.name ?? 'Unknown runner'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{item.user?.phone ?? '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-600 whitespace-nowrap">{fmt(item.submittedAt)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1.5">
                        <DocThumb url={item.idFrontUrl} />
                        <DocThumb url={item.idBackUrl} />
                        <DocThumb url={item.selfieUrl} />
                      </div>
                    </td>
                    <td className="px-5 py-4"><VerificationBadge status={item.status} /></td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => navigate(`/identity-verification/${item.user?._id}`)}
                        disabled={!item.user}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600 disabled:opacity-40"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
    </div>
  )
}
