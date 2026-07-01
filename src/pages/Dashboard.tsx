import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  ChevronDown,
  Users as UsersIcon,
  Footprints,
  ClipboardList,
  Banknote,
  Star,
  Package,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts'
import {
  fetchOverview,
  fetchErrandAnalytics,
  fetchPaymentAnalytics,
  fetchErrands,
  fetchUsers,
  fetchSystemStatus,
} from '../services/api'
import type {
  OverviewData,
  ErrandAnalytics,
  PaymentAnalytics,
  Errand,
  ErrandStatus,
  AdminUser,
  SystemStatusService,
} from '../types'
import { useAuth } from '../context/AuthContext'

const PRIMARY = '#FF6F3C'
const GREEN = '#22c55e'
const AMBER = '#fbbf24'
const RED = '#f87171'

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

type Granularity = 'month' | 'quarter' | 'year'

const GRANULARITY_OPTIONS: Array<{ value: Granularity; label: string }> = [
  { value: 'month', label: 'Daily' },
  { value: 'quarter', label: 'Weekly' },
  { value: 'year', label: 'Monthly' },
]

const formatBucketLabel = (label: string, granularity: Granularity) => {
  if (granularity === 'year') {
    const [, m] = label.split('-')
    return new Date(2000, Number(m) - 1, 1).toLocaleString('en-US', { month: 'short' })
  }
  if (granularity === 'quarter') {
    const [, w] = label.split('-')
    return `Wk ${w}`
  }
  const d = new Date(label)
  return Number.isNaN(d.getTime()) ? label : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

type Period = 'day' | 'week' | 'month' | 'quarter' | 'year'

const KPI_PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
]

// ── Dropdown ──────────────────────────────────────────────────────────────────

function Dropdown<T extends string>({
  value,
  options,
  onChange,
  icon,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
  icon?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const current = options.find((o) => o.value === value)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
      >
        {icon}
        {current?.label}
        <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-36 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
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

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string | number
  sub?: string
  icon: typeof UsersIcon
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  )
}

// ── Card shell ────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 ${className}`}>
      {children}
    </div>
  )
}

// ── Errand status bucketing ───────────────────────────────────────────────────

const bucketOf = (status: string): 'completed' | 'cancelled' | 'inProgress' =>
  status === 'completed' || status === 'confirmed'
    ? 'completed'
    : status === 'cancelled'
    ? 'cancelled'
    : 'inProgress'

const ERRAND_ICON_STYLE: Record<'completed' | 'cancelled' | 'inProgress', { bg: string; text: string; label: string }> = {
  completed: { bg: 'bg-green-50', text: 'text-green-600', label: 'Completed' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-500', label: 'Cancelled' },
  inProgress: { bg: 'bg-amber-50', text: 'text-amber-500', label: 'In Progress' },
}

function ErrandStatusBadge({ status }: { status: ErrandStatus }) {
  const bucket = bucketOf(status)
  const meta = ERRAND_ICON_STYLE[bucket]
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.text}`}>
      {meta.label}
    </span>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth()

  const [period, setPeriod] = useState<Period>('month')
  const [errandGranularity, setErrandGranularity] = useState<Granularity>('month')
  const [revenueGranularity, setRevenueGranularity] = useState<Granularity>('year')

  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewError, setOverviewError] = useState('')

  const [errandAnalytics, setErrandAnalytics] = useState<ErrandAnalytics | null>(null)
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null)

  const [recentErrands, setRecentErrands] = useState<Errand[]>([])
  const [topRunners, setTopRunners] = useState<AdminUser[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatusService[]>([])
  const [sideLoading, setSideLoading] = useState(true)

  // KPI overview (depends on selected period)
  useEffect(() => {
    setOverviewLoading(true)
    setOverviewError('')
    fetchOverview(period)
      .then(setOverview)
      .catch((err: Error) => setOverviewError(err.message))
      .finally(() => setOverviewLoading(false))
  }, [period])

  // Errands Overview chart + Errands by Status donut
  useEffect(() => {
    fetchErrandAnalytics(errandGranularity).then(setErrandAnalytics).catch(() => {})
  }, [errandGranularity])

  // Revenue Overview chart
  useEffect(() => {
    fetchPaymentAnalytics(revenueGranularity).then(setPaymentAnalytics).catch(() => {})
  }, [revenueGranularity])

  // Recent errands, top runners, system status — fetched once
  useEffect(() => {
    setSideLoading(true)
    Promise.all([
      fetchErrands({ limit: 5 }).then((res) => setRecentErrands(res.data.errands)).catch(() => {}),
      fetchUsers({ role: 'runner', limit: 5, sortBy: 'completedErrands', order: 'desc' })
        .then((res) => setTopRunners(res.data.users))
        .catch(() => {}),
      fetchSystemStatus().then(setSystemStatus).catch(() => {}),
    ]).finally(() => setSideLoading(false))
  }, [])

  const reloadOverview = () => {
    setOverviewLoading(true)
    setOverviewError('')
    fetchOverview(period).then(setOverview).catch((err: Error) => setOverviewError(err.message)).finally(() => setOverviewLoading(false))
  }

  // ── Derived: byStatus buckets for donut ─────────────────────────────────────
  const statusBuckets = { completed: 0, cancelled: 0, inProgress: 0 }
  errandAnalytics?.charts.byStatus.data.forEach((d) => {
    statusBuckets[bucketOf(d.label)] += d.count ?? 0
  })
  const statusTotal = statusBuckets.completed + statusBuckets.cancelled + statusBuckets.inProgress

  const donutData = [
    { name: 'Completed', value: statusBuckets.completed, color: GREEN },
    { name: 'In Progress', value: statusBuckets.inProgress, color: AMBER },
    { name: 'Cancelled', value: statusBuckets.cancelled, color: RED },
  ]

  const timeSeriesData = (errandAnalytics?.charts.timeSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label, errandGranularity),
    count: d.count ?? 0,
  }))

  const revenueData = (paymentAnalytics?.charts.revenueSeries.data ?? []).map((d) => ({
    label: formatBucketLabel(d.label, revenueGranularity),
    total: d.total ?? 0,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Welcome back, {user?.name?.split(' ')[0] ?? 'Admin'} 👋
          </p>
        </div>
        <Dropdown
          value={period}
          options={KPI_PERIOD_OPTIONS}
          onChange={setPeriod}
          icon={<Calendar className="h-3.5 w-3.5 text-gray-400" />}
        />
      </div>

      {/* Overview error */}
      {overviewError && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-100">
          {overviewError}
          <button onClick={reloadOverview} className="ml-auto text-xs font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-200" />
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Users"
            value={fmt(overview.users.total)}
            sub={`${overview.users.customers.active} customers active`}
            icon={UsersIcon}
            iconBg="bg-rose-50"
            iconColor="text-rose-500"
          />
          <StatCard
            label="Total Runners"
            value={fmt(overview.users.runners.total)}
            sub={`${overview.users.runners.active} active`}
            icon={Footprints}
            iconBg="bg-green-50"
            iconColor="text-green-600"
          />
          <StatCard
            label="Total Errands"
            value={fmt(overview.errands.total)}
            sub={`${overview.errands.completedCount} completed`}
            icon={ClipboardList}
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          />
          <StatCard
            label="Total Revenue"
            value={fmtCurrency(overview.payments.revenue.total)}
            sub={`${overview.payments.revenue.count} paid transactions`}
            icon={Banknote}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: charts */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Errands Overview */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Errands Overview</h3>
                <Dropdown value={errandGranularity} options={GRANULARITY_OPTIONS} onChange={setErrandGranularity} />
              </div>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeSeriesData}>
                    <defs>
                      <linearGradient id="errandsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                    <Area type="monotone" dataKey="count" stroke={PRIMARY} strokeWidth={2} fill="url(#errandsFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2 border-t border-gray-100 pt-4 text-center">
                <div>
                  <p className="text-base font-bold text-gray-900">{statusTotal}</p>
                  <p className="text-[11px] text-gray-400">Total</p>
                </div>
                <div>
                  <p className="text-base font-bold text-green-600">{statusBuckets.completed}</p>
                  <p className="text-[11px] text-gray-400">Completed</p>
                </div>
                <div>
                  <p className="text-base font-bold text-amber-500">{statusBuckets.inProgress}</p>
                  <p className="text-[11px] text-gray-400">In Progress</p>
                </div>
                <div>
                  <p className="text-base font-bold text-red-500">{statusBuckets.cancelled}</p>
                  <p className="text-[11px] text-gray-400">Cancelled</p>
                </div>
              </div>
            </Card>

            {/* Errands by Status donut */}
            <Card>
              <h3 className="text-sm font-bold text-gray-900">Errands by Status</h3>
              <div className="relative mt-2 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} paddingAngle={2}>
                      {donutData.map((d) => (
                        <Cell key={d.name} fill={d.color} stroke="none" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-lg font-bold text-gray-900">{statusTotal}</p>
                  <p className="text-[11px] text-gray-400">Total</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {donutData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-semibold text-gray-800">
                      {d.value} {statusTotal > 0 ? `(${Math.round((d.value / statusTotal) * 100)}%)` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Top Runners */}
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Top Runners</h3>
                <Link to="/runners" className="text-xs font-semibold text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-3 space-y-3">
                {sideLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />)
                ) : topRunners.length === 0 ? (
                  <p className="py-4 text-center text-xs text-gray-400">No runners yet</p>
                ) : (
                  topRunners.map((r) => (
                    <div key={r._id} className="flex items-center gap-3">
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
                      <p className="w-20 shrink-0 text-right text-xs font-semibold text-gray-800">
                        {fmtCurrency(r.wallet.earnings)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Revenue Overview */}
            <Card>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Revenue Overview</h3>
                <Dropdown value={revenueGranularity} options={GRANULARITY_OPTIONS} onChange={setRevenueGranularity} />
              </div>
              <div className="mt-4 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={32} />
                    <Tooltip
                      formatter={(value) => fmtCurrency(Number(value))}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }}
                    />
                    <Bar dataKey="total" fill={PRIMARY} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400">Total revenue</p>
                <p className="text-lg font-bold text-gray-900">
                  {paymentAnalytics ? fmtCurrency(paymentAnalytics.summary.revenue.total) : '—'}
                </p>
              </div>
            </Card>
          </div>
        </div>

        {/* Right: recent errands + system overview */}
        <div className="space-y-4 lg:col-span-1">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Recent Errands</h3>
              <Link to="/errands" className="text-xs font-semibold text-primary-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="mt-3 space-y-3">
              {sideLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100" />)
              ) : recentErrands.length === 0 ? (
                <p className="py-4 text-center text-xs text-gray-400">No errands yet</p>
              ) : (
                recentErrands.map((e) => {
                  const meta = ERRAND_ICON_STYLE[bucketOf(e.status)]
                  return (
                    <div key={e._id} className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                        <Package className={`h-4 w-4 ${meta.text}`} strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{e.title}</p>
                        <p className="text-[11px] text-gray-400">{relativeTime(e.createdAt)}</p>
                      </div>
                      <ErrandStatusBadge status={e.status} />
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-gray-900">System Overview</h3>
            <div className="mt-3 space-y-3">
              {sideLoading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" />)
              ) : (
                systemStatus.map((s) => (
                  <div key={s.key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {s.operational ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.label}</p>
                        <p className="text-[11px] text-gray-400">{s.detail}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold ${s.operational ? 'text-green-600' : 'text-red-500'}`}>
                      {s.operational ? 'Operational' : 'Issue'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
