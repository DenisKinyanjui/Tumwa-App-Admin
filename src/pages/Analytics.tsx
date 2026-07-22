import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import {
  Calendar,
  MapPin,
  Users as UsersIcon,
  Footprints,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Banknote,
  Percent,
  ShieldCheck,
  AlertTriangle,
  Wallet,
  Lock,
  ArrowDownToLine,
  Download,
  Star,
  UserCheck,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  fetchOverview,
  fetchErrandAnalytics,
  fetchPaymentAnalytics,
  fetchRunnerAnalytics,
  fetchCustomerAnalytics,
  fetchDisputeAnalytics,
  fetchLocationAnalytics,
  fetchVerificationAnalytics,
  fetchServiceAreas,
  fetchVerificationsQueue,
  fetchPayments,
  fetchDisputes,
  fetchErrands,
  fetchUsers,
  generateReport,
} from '../services/api'
import type {
  OverviewData,
  ErrandAnalytics,
  PaymentAnalytics,
  RunnerAnalytics,
  CustomerAnalytics,
  DisputeAnalytics,
  LocationAnalytics,
  VerificationAnalytics,
  ServiceArea,
} from '../types'
import Card from '../components/Card'
import StatCard from '../components/StatCard'
import Dropdown from '../components/Dropdown'

const PRIMARY = '#248249'
const ACCENT = '#F46525'
const GREEN = '#22c55e'
const AMBER = '#fbbf24'
const RED = '#f87171'
const BLUE = '#3b82f6'

// ── Formatting helpers ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n)

const fmtCurrency = (n: number) =>
  `KES ${n.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

const relativeTime = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

const formatBucketLabel = (label: string) => {
  // Hourly buckets look like "2026-07-22T14:00"
  if (label.includes('T')) {
    const d = new Date(label)
    return Number.isNaN(d.getTime()) ? label : d.toLocaleTimeString('en-US', { hour: 'numeric' })
  }
  const d = new Date(label)
  return Number.isNaN(d.getTime()) ? label : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type UserScope = 'all' | 'runner' | 'customer'

const SCOPE_OPTIONS: Array<{ value: UserScope; label: string }> = [
  { value: 'all', label: 'All Users' },
  { value: 'runner', label: 'Runners' },
  { value: 'customer', label: 'Customers' },
]

// ── Recent activity feed ──────────────────────────────────────────────────────

interface ActivityItem {
  id: string
  label: string
  detail: string
  at: string
  icon: typeof UsersIcon
  iconBg: string
  iconColor: string
}

const LARGE_WITHDRAWAL_THRESHOLD = 5000
const HIGH_VALUE_ERRAND_THRESHOLD = 3000

// ── Analytics page ────────────────────────────────────────────────────────────

export default function Analytics() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()

  const [period, setPeriod] = useState<Period>('month')
  const [locationFilter, setLocationFilter] = useState('')
  const [userScope, setUserScope] = useState<UserScope>('all')
  const [areas, setAreas] = useState<ServiceArea[]>([])

  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  const [errandAnalytics, setErrandAnalytics] = useState<ErrandAnalytics | null>(null)
  const [hourlyAnalytics, setHourlyAnalytics] = useState<ErrandAnalytics | null>(null)
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null)
  const [runnerAnalytics, setRunnerAnalytics] = useState<RunnerAnalytics | null>(null)
  const [customerAnalytics, setCustomerAnalytics] = useState<CustomerAnalytics | null>(null)
  const [disputeAnalytics, setDisputeAnalytics] = useState<DisputeAnalytics | null>(null)
  const [locationAnalytics, setLocationAnalytics] = useState<LocationAnalytics | null>(null)
  const [verificationAnalytics, setVerificationAnalytics] = useState<VerificationAnalytics | null>(null)

  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  const [exportState, setExportState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  useEffect(() => {
    setSubtitle('Monitor platform performance in real time.')
  }, [setSubtitle])

  useEffect(() => {
    fetchServiceAreas().then(setAreas).catch(() => {})
  }, [])

  // KPI overview
  useEffect(() => {
    setOverviewLoading(true)
    setOverviewError('')
    fetchOverview(period)
      .then(setOverview)
      .catch((err: Error) => setOverviewError(err.message))
      .finally(() => setOverviewLoading(false))
  }, [period])

  // Charts driven by the selected period
  useEffect(() => {
    fetchErrandAnalytics(period).then(setErrandAnalytics).catch(() => {})
    fetchPaymentAnalytics(period).then(setPaymentAnalytics).catch(() => {})
    fetchRunnerAnalytics(period).then(setRunnerAnalytics).catch(() => {})
    fetchCustomerAnalytics(period).then(setCustomerAnalytics).catch(() => {})
    fetchDisputeAnalytics(period).then(setDisputeAnalytics).catch(() => {})
    fetchLocationAnalytics(period).then(setLocationAnalytics).catch(() => {})
    fetchVerificationAnalytics(period).then(setVerificationAnalytics).catch(() => {})
  }, [period])

  // Hourly Demand — always "today", independent of the selected period
  useEffect(() => {
    fetchErrandAnalytics('day').then(setHourlyAnalytics).catch(() => {})
  }, [])

  // Recent activity feed — merges a few existing endpoints into one list and
  // re-polls periodically for a near-real-time feel (no dedicated push
  // channel exists for these event types yet).
  useEffect(() => {
    const load = () => {
      Promise.all([
        fetchVerificationsQueue({ limit: 10 })
          .then((res) =>
            res.data.verifications
              .filter((v) => v.status === 'approved' || v.status === 'rejected')
              .map((v): ActivityItem => ({
                id: `verif-${v._id}`,
                label: v.status === 'approved' ? 'Verification approved' : 'Verification rejected',
                detail: v.user?.name ?? 'Unknown runner',
                at: v.reviewedAt ?? v.submittedAt,
                icon: ShieldCheck,
                iconBg: v.status === 'approved' ? 'bg-green-50' : 'bg-red-50',
                iconColor: v.status === 'approved' ? 'text-green-600' : 'text-red-500',
              })),
          )
          .catch(() => [] as ActivityItem[]),

        fetchPayments({ type: 'withdrawal', limit: 20 })
          .then((res) =>
            res.data.payments
              .filter((p) => p.amount >= LARGE_WITHDRAWAL_THRESHOLD)
              .map((p): ActivityItem => ({
                id: `wd-${p._id}`,
                label: 'Large withdrawal',
                detail: `${p.runner?.name ?? 'Runner'} — ${fmtCurrency(p.amount)}`,
                at: p.createdAt,
                icon: ArrowDownToLine,
                iconBg: 'bg-amber-50',
                iconColor: 'text-amber-600',
              })),
          )
          .catch(() => [] as ActivityItem[]),

        fetchDisputes()
          .then((disputes) =>
            disputes.slice(0, 10).map((d): ActivityItem => ({
              id: `dispute-${d._id}`,
              label: 'Dispute opened',
              detail: d.errand?.title ?? d.reason,
              at: d.createdAt,
              icon: AlertTriangle,
              iconBg: 'bg-red-50',
              iconColor: 'text-red-500',
            })),
          )
          .catch(() => [] as ActivityItem[]),

        fetchErrands({ status: 'completed', limit: 20 })
          .then((res) =>
            res.data.errands
              .filter((e) => e.amount >= HIGH_VALUE_ERRAND_THRESHOLD)
              .map((e): ActivityItem => ({
                id: `errand-${e._id}`,
                label: 'High-value errand completed',
                detail: `${e.title} — ${fmtCurrency(e.amount)}`,
                at: e.completedAt ?? e.createdAt,
                icon: ClipboardList,
                iconBg: 'bg-purple-50',
                iconColor: 'text-purple-600',
              })),
          )
          .catch(() => [] as ActivityItem[]),

        fetchUsers({ role: 'runner', limit: 10, sortBy: 'createdAt', order: 'desc' })
          .then((res) =>
            res.data.users.map((r): ActivityItem => ({
              id: `runner-${r._id}`,
              label: 'New runner registered',
              detail: r.name,
              at: r.createdAt,
              icon: UserCheck,
              iconBg: 'bg-blue-50',
              iconColor: 'text-blue-600',
            })),
          )
          .catch(() => [] as ActivityItem[]),
      ]).then((groups) => {
        const merged = groups
          .flat()
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 12)
        setActivity(merged)
        setActivityLoading(false)
      })
    }

    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const handleExportSnapshot = () => {
    setExportState('working')
    generateReport({ type: 'finance', format: 'pdf', filters: { period } })
      .then(() => setExportState('done'))
      .catch(() => setExportState('error'))
  }

  // ── Derived chart data ───────────────────────────────────────────────────────

  const revenueTrendData = (paymentAnalytics?.charts.revenueSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label),
    total: d.total ?? 0,
  }))

  const dailyErrandsData = (errandAnalytics?.charts.timeSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label),
    count: d.count ?? 0,
  }))

  const hourlyDemandData = (hourlyAnalytics?.charts.timeSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label),
    count: d.count ?? 0,
  }))

  // Merge customer + runner growth series by date label into one comparison chart
  const registrationsByLabel = new Map<string, { label: string; customers: number; runners: number }>()
  ;(customerAnalytics?.charts.customerGrowth.data ?? []).forEach((d) => {
    const label = formatBucketLabel(d.label)
    const row = registrationsByLabel.get(label) ?? { label, customers: 0, runners: 0 }
    row.customers += d.count ?? 0
    registrationsByLabel.set(label, row)
  })
  ;(runnerAnalytics?.charts.runnerGrowth.data ?? []).forEach((d) => {
    const label = formatBucketLabel(d.label)
    const row = registrationsByLabel.get(label) ?? { label, customers: 0, runners: 0 }
    row.runners += d.count ?? 0
    registrationsByLabel.set(label, row)
  })
  const registrationsData = Array.from(registrationsByLabel.values())
  const userGrowthData = registrationsData.map((d) => ({ label: d.label, total: d.customers + d.runners }))

  const withdrawalTrendData = (paymentAnalytics?.charts.withdrawalSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label),
    total: d.total ?? 0,
  }))

  const disputeTrendData = (disputeAnalytics?.charts.timeSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label),
    count: d.count ?? 0,
    resolvedCount: d.completedCount ?? 0,
  }))

  const verificationStatusData = (verificationAnalytics?.charts.byStatus.data ?? []).map((d, i) => ({
    name: d.label,
    value: d.count ?? 0,
    color: [PRIMARY, AMBER, RED, '#a78bfa'][i % 4],
  }))

  const completionVsCancellation = errandAnalytics
    ? [
        { name: 'Completed', value: errandAnalytics.summary.completedCount, color: GREEN },
        {
          name: 'Cancelled',
          value: Math.max(0, errandAnalytics.summary.total - errandAnalytics.summary.completedCount),
          color: RED,
        },
      ]
    : []

  const topRegionsData = (locationAnalytics?.charts.topRegions.data ?? [])
    .filter((d) => !locationFilter || d.label === locationFilter)
    .map((d) => ({ label: d.label, count: d.count ?? 0 }))

  const revenueByRegionData = (locationAnalytics?.charts.revenueByRegion.data ?? [])
    .filter((d) => !locationFilter || d.label === locationFilter)
    .map((d) => ({ label: d.label, total: d.total ?? 0 }))

  const openDisputes = overview
    ? (overview.disputes.byStatus.pending ?? 0) + (overview.disputes.byStatus.under_review ?? 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <Dropdown
          value={locationFilter || '__all__'}
          options={[{ value: '__all__', label: 'All Locations' }, ...areas.map((a) => ({ value: a.name, label: a.name }))]}
          onChange={(v) => setLocationFilter(v === '__all__' ? '' : v)}
          icon={<MapPin className="h-3.5 w-3.5 text-gray-400" />}
        />
        <Dropdown value={userScope} options={SCOPE_OPTIONS} onChange={setUserScope} icon={<UsersIcon className="h-3.5 w-3.5 text-gray-400" />} />
        <Dropdown value={period} options={PERIOD_OPTIONS} onChange={setPeriod} icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />} />
        <button
          onClick={handleExportSnapshot}
          disabled={exportState === 'working'}
          className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          <Download className="h-3.5 w-3.5" />
          {exportState === 'working' ? 'Exporting…' : 'Export Snapshot'}
        </button>
      </div>

      {exportState === 'done' && (
        <div className="flex items-center gap-3 rounded-xl bg-green-50 p-3 text-sm text-green-700 ring-1 ring-green-100">
          Snapshot queued.{' '}
          <Link to="/reports" className="font-semibold underline">
            View in Reports
          </Link>
        </div>
      )}
      {exportState === 'error' && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-100">
          Couldn't export snapshot — try again.
        </div>
      )}

      {overviewError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          {overviewError}
        </div>
      )}

      {/* KPI cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/payments"><StatCard label="Total Revenue" value={fmtCurrency(overview.payments.revenue.total)} sub={`${overview.payments.revenue.count} transactions`} icon={Banknote} iconBg="bg-amber-50" iconColor="text-amber-600" /></Link>
          <Link to="/payments"><StatCard label="Platform Commission" value={fmtCurrency(overview.payments.commission)} icon={Percent} iconBg="bg-orange-50" iconColor="text-orange-600" /></Link>
          <Link to="/errands"><StatCard label="Total Errands" value={fmt(overview.errands.total)} icon={ClipboardList} iconBg="bg-purple-50" iconColor="text-purple-600" /></Link>
          <Link to="/errands"><StatCard label="Completed Errands" value={fmt(overview.errands.completedCount)} sub={`${overview.errands.completionRate}% completion rate`} icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" /></Link>
          <Link to="/errands"><StatCard label="Cancelled Errands" value={fmt(overview.errands.cancelledCount)} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" /></Link>
          <Link to="/customers"><StatCard label="Active Customers" value={fmt(overview.users.customers.active)} sub={`${overview.users.customers.total} total`} icon={UsersIcon} iconBg="bg-rose-50" iconColor="text-rose-500" /></Link>
          <Link to="/runners"><StatCard label="Active Runners" value={fmt(overview.users.runners.active)} sub={`${overview.users.runners.total} total`} icon={Footprints} iconBg="bg-green-50" iconColor="text-green-600" /></Link>
          <Link to="/identity-verification"><StatCard label="Pending Verifications" value={fmt(overview.users.runners.verification.pending)} icon={ShieldCheck} iconBg="bg-blue-50" iconColor="text-blue-600" /></Link>
          <Link to="/disputes"><StatCard label="Open Disputes" value={fmt(openDisputes)} icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" /></Link>
          <Link to="/customers"><StatCard label="Customer Wallet Balance" value={fmtCurrency(overview.wallets.customerWalletTotal)} icon={Wallet} iconBg="bg-teal-50" iconColor="text-teal-600" /></Link>
          <Link to="/payments"><StatCard label="Escrow Balance" value={fmtCurrency(overview.wallets.escrowTotal)} icon={Lock} iconBg="bg-indigo-50" iconColor="text-indigo-600" /></Link>
          <Link to="/withdrawals"><StatCard label="Pending Withdrawals" value={fmtCurrency(overview.payments.pendingWithdrawals.total)} sub={`${overview.payments.pendingWithdrawals.count} pending`} icon={ArrowDownToLine} iconBg="bg-amber-50" iconColor="text-amber-600" /></Link>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-bold text-gray-900">Revenue Trend</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrendData}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Area type="monotone" dataKey="total" stroke={PRIMARY} strokeWidth={2} fill="url(#revenueFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Daily Errands</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyErrandsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Bar dataKey="count" fill={ACCENT} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">User Growth</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={userGrowthData}>
                <defs>
                  <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={BLUE} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Area type="monotone" dataKey="total" stroke={BLUE} strokeWidth={2} fill="url(#userGrowthFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Customer vs Runner Registrations</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationsData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="customers" name="Customers" stroke={ACCENT} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="runners" name="Runners" stroke={PRIMARY} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Completion vs Cancellation</h3>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={completionVsCancellation} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {completionVsCancellation.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Hourly Demand (Today)</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDemandData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Bar dataKey="count" fill={PRIMARY} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Working Capital Utilization</h3>
          {overview && (
            <div className="mt-4 space-y-3">
              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-primary-600"
                  style={{ width: `${Math.min(100, overview.workingCapital.avgUtilization)}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-gray-900">{overview.workingCapital.avgUtilization}%</p>
              <p className="text-xs text-gray-400">
                {fmtCurrency(overview.workingCapital.totalUsed)} used of {fmtCurrency(overview.workingCapital.totalLimit)} total limit
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Withdrawal Trends</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={withdrawalTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Line type="monotone" dataKey="total" stroke={AMBER} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Verification Status Breakdown</h3>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={verificationStatusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {verificationStatusData.map((d) => (
                    <Cell key={d.name} fill={d.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Dispute Trends</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={disputeTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="count" name="Opened" stroke={RED} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="resolvedCount" name="Resolved" stroke={GREEN} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Geographic analytics */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="text-sm font-bold text-gray-900">Top Regions by Errands</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRegionsData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Bar dataKey="count" fill={PRIMARY} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Top Performing Locations (Revenue)</h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByRegionData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip formatter={(v) => fmtCurrency(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                <Bar dataKey="total" fill={ACCENT} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {userScope !== 'customer' && (
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Top Runners</h3>
              <Link to="/runners" className="text-xs font-semibold text-primary-600 hover:underline">View all</Link>
            </div>
            <div className="mt-3 space-y-3">
              {(runnerAnalytics?.topRunners.data ?? []).slice(0, 6).length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">No runners yet</p>
              ) : (
                (runnerAnalytics?.topRunners.data ?? []).slice(0, 6).map((r) => (
                  <Link to={`/users/${r._id}`} key={r._id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-600">
                      {r.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{r.name}</p>
                      <p className="text-[11px] text-gray-400">{r.completedErrands} completed</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {r.rating.toFixed(1)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        )}

        {userScope !== 'runner' && (
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Most Active Customers</h3>
              <Link to="/customers" className="text-xs font-semibold text-primary-600 hover:underline">View all</Link>
            </div>
            <div className="mt-3 space-y-3">
              {(customerAnalytics?.topCustomers.data ?? []).slice(0, 6).length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">No customers yet</p>
              ) : (
                (customerAnalytics?.topCustomers.data ?? []).slice(0, 6).map((c) => (
                  <div key={c.phone} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-50 text-xs font-bold text-rose-500">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">{c.name}</p>
                      <p className="text-[11px] text-gray-400">{c.errandCount} errands</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-800">{fmtCurrency(c.totalSpend)}</p>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="text-sm font-bold text-gray-900">Top Categories</h3>
          <div className="mt-3 flex h-32 items-center justify-center text-center">
            <p className="text-xs text-gray-400">Errand categories aren't tracked yet — this list will populate once category tagging ships.</p>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <h3 className="text-sm font-bold text-gray-900">Highest Revenue Locations</h3>
          <div className="mt-3 space-y-2">
            {revenueByRegionData.length === 0 ? (
              <p className="py-4 text-center text-xs text-gray-400">No data yet</p>
            ) : (
              revenueByRegionData.slice(0, 8).map((r, i) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{i + 1}. {r.label}</span>
                  <span className="font-semibold text-gray-900">{fmtCurrency(r.total)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity feed */}
      <Card>
        <h3 className="text-sm font-bold text-gray-900">Recent Activity</h3>
        <div className="mt-3 space-y-3">
          {activityLoading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)
          ) : activity.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">No recent activity</p>
          ) : (
            activity.map((item) => {
              const Icon = item.icon
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.iconBg}`}>
                    <Icon className={`h-4 w-4 ${item.iconColor}`} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="truncate text-[11px] text-gray-400">{item.detail}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-gray-400">{relativeTime(item.at)}</p>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
