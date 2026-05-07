import { useEffect, useState } from 'react'
import { fetchOverview } from '../services/api'
import type { OverviewData } from '../types'

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: React.ReactNode
  color: string
}

function StatCard({ label, value, sub, icon, color }: StatCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ── Status badge ─────────────────────────────────────────────────────────────

function StatusDot({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <span className="text-sm text-gray-600">
        <span className="font-semibold text-gray-800">{count}</span> {label}
      </span>
    </div>
  )
}

// ── Period selector ───────────────────────────────────────────────────────────

const PERIODS = ['day', 'week', 'month', 'quarter', 'year'] as const
type Period = (typeof PERIODS)[number]

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState<Period>('month')

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchOverview(period)
      .then(setData)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [period])

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `${(n / 1_000).toFixed(1)}K`
      : String(n)

  const fmtCurrency = (n: number) =>
    `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-0.5 text-sm text-gray-500">Platform overview and key metrics</p>
        </div>

        {/* Period selector */}
        <div className="flex rounded-xl bg-gray-100 p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
          <button
            onClick={() => {
              setError('')
              setLoading(true)
              fetchOverview(period).then(setData).catch((e: Error) => setError(e.message)).finally(() => setLoading(false))
            }}
            className="ml-auto text-xs font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      )}

      {/* Stats grid */}
      {!loading && data && (
        <>
          {/* Primary KPI row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Users"
              value={fmt(data.users.total)}
              sub={`${data.users.customers.active} customers active`}
              color="bg-blue-50 text-blue-600"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <StatCard
              label="Total Runners"
              value={fmt(data.users.runners.total)}
              sub={`${data.users.runners.active} active`}
              color="bg-purple-50 text-purple-600"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
            />
            <StatCard
              label="Total Errands"
              value={fmt(data.errands.total)}
              sub={`${data.errands.completedCount} completed`}
              color="bg-orange-50 text-primary-500"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              }
            />
            <StatCard
              label="Revenue"
              value={fmtCurrency(data.payments.revenue.total)}
              sub={`${data.payments.revenue.count} paid transactions`}
              color="bg-green-50 text-green-600"
              icon={
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Errand breakdown */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Errand Status</p>
              <div className="space-y-3">
                <StatusDot count={data.errands.pendingCount}   label="pending"   color="bg-yellow-400" />
                <StatusDot count={data.errands.completedCount} label="completed" color="bg-green-500"  />
                <StatusDot count={data.errands.cancelledCount} label="cancelled" color="bg-red-400"    />
                <StatusDot count={data.errands.disputedCount}  label="disputed"  color="bg-orange-400" />
              </div>
              <div className="mt-4 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">
                  Avg value:{' '}
                  <span className="font-semibold text-gray-700">
                    {fmtCurrency(Math.round(data.errands.avgAmount ?? 0))}
                  </span>
                </p>
              </div>
            </div>

            {/* Disputes */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Disputes</p>
              <p className="text-3xl font-bold text-gray-900">{data.disputes.total}</p>
              <div className="mt-4 space-y-3">
                <StatusDot
                  count={(data.disputes.byStatus.pending ?? 0) + (data.disputes.byStatus.under_review ?? 0)}
                  label="open"
                  color="bg-yellow-400"
                />
                <StatusDot
                  count={data.disputes.byStatus.resolved ?? 0}
                  label="resolved"
                  color="bg-green-500"
                />
              </div>
            </div>

            {/* This period */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">
                This {period}
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">New errands</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(data.errands.inPeriod.count)}</p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">Period revenue</p>
                  <p className="text-xl font-bold text-gray-900">
                    {fmtCurrency(data.payments.inPeriodRevenue.total)}
                  </p>
                </div>
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">Completion rate</p>
                  <p className="text-xl font-bold text-gray-900">
                    {data.errands.inPeriod.count > 0
                      ? `${Math.round((data.errands.inPeriod.completedCount / data.errands.inPeriod.count) * 100)}%`
                      : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
