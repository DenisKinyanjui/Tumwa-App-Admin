import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Bell, CheckCircle2, XCircle, MailOpen, TrendingUp, Settings2, Radar, Megaphone, BellRing, Users, User, Footprints, UserSearch } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import type { NotificationCampaign, NotificationAudience, NotificationCampaignType, NotificationCampaignStatus, NotificationCampaignUser } from '../types'
import { fetchNotificationCampaign } from '../services/api'

const GREEN = '#248249'
const RED = '#f87171'
const GRAY = '#e5e7eb'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

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

function isUserObject(u: string | NotificationCampaignUser): u is NotificationCampaignUser {
  return typeof u === 'object'
}

function audienceLabel(c: NotificationCampaign) {
  if (c.audience !== 'specific') return AUDIENCE_META[c.audience].label
  const names = c.specificUserIds.filter(isUserObject).map((u) => u.name)
  if (names.length === 0) return `${c.specificUserIds.length} selected users`
  return names.length <= 3 ? names.join(', ') : `${names.slice(0, 3).join(', ')} +${names.length - 3} more`
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

function AnalyticsStat({
  label, value, icon: Icon, iconBg, iconColor,
}: { label: string; value: string; icon: typeof CheckCircle2; iconBg: string; iconColor: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function DonutStat({
  title, value, valueLabel, data,
}: { title: string; value: string; valueLabel: string; data: Array<{ name: string; value: number; color: string }> }) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <div className="relative mt-2 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={65} paddingAngle={2}>
              {data.map((d) => <Cell key={d.name} fill={d.color} stroke="none" />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-bold text-gray-900">{value}</p>
          <p className="text-[11px] text-gray-400">{valueLabel}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name}
            </span>
            <span className="font-semibold text-gray-800">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

export default function NotificationDetail() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [campaign, setCampaign] = useState<NotificationCampaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    fetchNotificationCampaign(id)
      .then(setCampaign)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSubtitle(campaign ? campaign.title : 'Notification')
  }, [campaign, setSubtitle])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-700">{error || 'Notification not found'}</p>
        <p className="text-xs text-gray-400">It may have been deleted, or the link is no longer valid.</p>
        <div className="mt-1 flex gap-2">
          {error && (
            <button onClick={load} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">
              Retry
            </button>
          )}
          <button onClick={() => navigate('/notifications')} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-700">
            Back to Notifications
          </button>
        </div>
      </div>
    )
  }

  const AudIcon = AUDIENCE_META[campaign.audience].icon
  const TypeIcon = TYPE_META[campaign.type].icon
  const wasSent = campaign.status === 'sent' || campaign.status === 'failed'
  const deliveryRate = campaign.recipients > 0 ? Math.round((campaign.delivered / campaign.recipients) * 100) : 0
  const openRate = campaign.delivered > 0 ? Math.round((campaign.opened / campaign.delivered) * 100) : 0

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/notifications')} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to Notifications
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: info */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_META[campaign.type].className}`}>
                <TypeIcon className="h-3 w-3" /> {TYPE_META[campaign.type].label}
              </span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_META[campaign.status].className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${STATUS_META[campaign.status].dot}`} />
                {STATUS_META[campaign.status].label}
              </span>
            </div>
            <h1 className="mt-3 text-lg font-bold text-gray-900">{campaign.title}</h1>

            {/* Message preview */}
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <div className="flex items-start gap-2.5 p-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-600">
                  <Bell className="h-4 w-4 text-white" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Tumwa</p>
                  <p className="mt-0.5 text-sm font-bold text-gray-900">{campaign.title}</p>
                  <p className="mt-0.5 text-sm text-gray-600">{campaign.message}</p>
                </div>
              </div>
              {campaign.bannerImageUrl && <img src={campaign.bannerImageUrl} alt="" className="h-40 w-full object-cover" />}
            </div>

            {/* Meta grid */}
            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Audience</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <AudIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <span className="truncate" title={audienceLabel(campaign)}>{audienceLabel(campaign)}</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recipients</p>
                <p className="mt-1 text-sm font-semibold text-gray-800">{campaign.recipients.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                  {campaign.status === 'scheduled' ? 'Scheduled For' : campaign.sentAt ? 'Sent At' : 'Created'}
                </p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800">
                  {fmtDateTime(campaign.sentAt ?? campaign.scheduledAt ?? campaign.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Last Updated</p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800">{fmtDateTime(campaign.updatedAt)}</p>
              </div>
            </div>

            {campaign.status === 'failed' && campaign.failureReason && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
                <span className="font-semibold">Failure reason: </span>{campaign.failureReason}
              </div>
            )}
          </Card>

          {/* Analytics stat row */}
          {wasSent ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <AnalyticsStat label="Delivered" value={campaign.delivered.toLocaleString()} icon={CheckCircle2} iconBg="bg-green-50" iconColor="text-green-600" />
              <AnalyticsStat label="Opened" value={campaign.opened.toLocaleString()} icon={MailOpen} iconBg="bg-primary-50" iconColor="text-primary-600" />
              <AnalyticsStat label="Failed" value={campaign.failed.toLocaleString()} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
              <AnalyticsStat label="Open Rate" value={`${openRate}%`} icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" />
            </div>
          ) : (
            <Card>
              <p className="text-sm text-gray-500">
                {campaign.status === 'scheduled'
                  ? 'This notification hasn\'t been sent yet — delivery analytics will appear here once it goes out.'
                  : 'This is a draft — delivery analytics will appear here once it\'s sent.'}
              </p>
            </Card>
          )}
        </div>

        {/* Right: charts */}
        <div className="space-y-5 lg:col-span-1">
          {wasSent ? (
            <>
              <DonutStat
                title="Delivery Rate"
                value={`${deliveryRate}%`}
                valueLabel="Delivered"
                data={[
                  { name: 'Delivered', value: campaign.delivered, color: GREEN },
                  { name: 'Failed', value: campaign.failed, color: RED },
                ]}
              />
              <DonutStat
                title="Open Rate"
                value={`${openRate}%`}
                valueLabel="Opened"
                data={[
                  { name: 'Opened', value: campaign.opened, color: GREEN },
                  { name: 'Not Opened', value: Math.max(campaign.delivered - campaign.opened, 0), color: GRAY },
                ]}
              />
            </>
          ) : (
            <Card>
              <h3 className="text-sm font-bold text-gray-900">Analytics</h3>
              <p className="mt-2 text-xs text-gray-400">No delivery data yet.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
