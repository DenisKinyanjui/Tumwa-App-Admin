import { Inbox, Clock, UserCheck, CheckCircle2 } from 'lucide-react'
import { CHANNEL_META } from './supportMeta'
import type { SupportDashboardData } from '../../types'

interface SupportDashboardCardsProps {
  data: SupportDashboardData | null
  loading: boolean
}

function StatCard({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: number
  icon: typeof Inbox
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function SupportDashboardCards({ data, loading }: SupportDashboardCardsProps) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 border-b border-gray-100 bg-white p-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    )
  }

  return (
    <div className="border-b border-gray-100 bg-white p-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open Conversations" value={data.summary.open} icon={Inbox} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Waiting for Admin" value={data.summary.waitingAdmin} icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
        <StatCard label="Waiting for User" value={data.summary.waitingUser} icon={UserCheck} iconBg="bg-purple-50" iconColor="text-purple-600" />
        <StatCard label="Resolved Today" value={data.summary.resolvedToday} icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
        {Object.entries(data.channels).map(([channel, count]) => {
          const meta = CHANNEL_META[channel as keyof typeof CHANNEL_META]
          const Icon = meta.icon
          return (
            <span key={channel} className="flex items-center gap-1.5 rounded-lg bg-gray-50 px-2.5 py-1">
              <Icon className="h-3.5 w-3.5" /> {meta.label}: <strong className="text-gray-700">{count}</strong>
            </span>
          )
        })}
      </div>
    </div>
  )
}
