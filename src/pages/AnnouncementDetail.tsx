import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Eye, MousePointerClick, XCircle, TrendingUp, Users2, Clock } from 'lucide-react'
import {
  ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line, ComposedChart,
} from 'recharts'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import type { Announcement, AnnouncementAnalytics, NotificationCampaignUser, AnnouncementLocation } from '../types'
import { fetchAnnouncement, fetchAnnouncementAnalytics } from '../services/api'
import { AUDIENCE_META, TRIGGER_META } from '../components/announcements/announcementMeta'
import { TYPE_META, StatusBadge, TypeBadge } from './Announcements'

const PRIMARY = '#248249'
const ACCENT = '#F46525'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

function isUserObject(u: string | NotificationCampaignUser): u is NotificationCampaignUser {
  return typeof u === 'object'
}
function isLocationObject(l: string | AnnouncementLocation): l is AnnouncementLocation {
  return typeof l === 'object'
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
}

function AnalyticsStat({
  label, value, icon: Icon, iconBg, iconColor,
}: { label: string; value: string; icon: typeof Eye; iconBg: string; iconColor: string }) {
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

export default function AnnouncementDetail() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [analytics, setAnalytics] = useState<AnnouncementAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    if (!id) return
    setLoading(true)
    setError('')
    Promise.all([fetchAnnouncement(id), fetchAnnouncementAnalytics(id)])
      .then(([a, an]) => { setAnnouncement(a); setAnalytics(an) })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setSubtitle(announcement ? announcement.title : 'Announcement')
  }, [announcement, setSubtitle])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100" />
      </div>
    )
  }

  if (error || !announcement) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white py-20 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-700">{error || 'Announcement not found'}</p>
        <div className="mt-1 flex gap-2">
          {error && <button onClick={load} className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50">Retry</button>}
          <button onClick={() => navigate('/announcements')} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-700">Back to Announcements</button>
        </div>
      </div>
    )
  }

  const AudIcon = AUDIENCE_META[announcement.targetAudience].icon
  const users = announcement.selectedUsers.filter(isUserObject)
  const locations = announcement.selectedLocations.filter(isLocationObject)

  return (
    <div className="space-y-5">
      <button onClick={() => navigate('/announcements')} className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" /> Back to Announcements
      </button>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: info */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={announcement.type} />
              <StatusBadge status={announcement.status} />
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold capitalize text-gray-600">{announcement.priority} priority</span>
            </div>
            <h1 className="mt-3 text-lg font-bold text-gray-900">{announcement.title}</h1>
            {announcement.subtitle && <p className="text-sm font-medium text-gray-500">{announcement.subtitle}</p>}

            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50">
              <div className="p-4">
                <p className="text-sm text-gray-700">{announcement.description}</p>
              </div>
              {announcement.imageUrl && <img src={announcement.imageUrl} alt="" className="h-40 w-full object-cover" />}
              {(announcement.primaryButtonText || announcement.secondaryButtonText) && (
                <div className="flex gap-2 border-t border-gray-100 p-3">
                  {announcement.primaryButtonText && (
                    <span className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white">{announcement.primaryButtonText}</span>
                  )}
                  {announcement.secondaryButtonText && (
                    <span className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600">{announcement.secondaryButtonText}</span>
                  )}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Audience</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                  <AudIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {AUDIENCE_META[announcement.targetAudience].label}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Start Date</p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800">{fmtDateTime(announcement.startDate)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">End Date</p>
                <p className="mt-1 whitespace-nowrap text-sm font-semibold text-gray-800">{fmtDateTime(announcement.endDate)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Display Frequency</p>
                <p className="mt-1 text-sm font-semibold capitalize text-gray-800">{announcement.displayFrequency.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 border-t border-gray-100 pt-4">
              {announcement.triggers.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                  {TRIGGER_META[t].label}
                </span>
              ))}
            </div>

            {users.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Selected Users</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {users.map((u) => (
                    <span key={u._id} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{u.name}</span>
                  ))}
                </div>
              </div>
            )}
            {locations.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Selected Locations</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {locations.map((l) => (
                    <span key={l._id} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">{l.name}</span>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Analytics stat row */}
          {analytics && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <AnalyticsStat label="Views" value={analytics.views.toLocaleString()} icon={Eye} iconBg="bg-primary-50" iconColor="text-primary-600" />
              <AnalyticsStat label="Dismissals" value={analytics.dismissals.toLocaleString()} icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
              <AnalyticsStat label="Button Clicks" value={analytics.clicks.toLocaleString()} icon={MousePointerClick} iconBg="bg-accent-50" iconColor="text-accent-700" />
              <AnalyticsStat label="CTR" value={`${analytics.ctr}%`} icon={TrendingUp} iconBg="bg-amber-50" iconColor="text-amber-600" />
              <AnalyticsStat label="Active Users Reached" value={analytics.activeUsersReached.toLocaleString()} icon={Users2} iconBg="bg-blue-50" iconColor="text-blue-600" />
              <AnalyticsStat label="Last Seen" value={analytics.lastSeen ? fmtDateTime(analytics.lastSeen) : '—'} icon={Clock} iconBg="bg-gray-100" iconColor="text-gray-500" />
            </div>
          )}
        </div>

        {/* Right: chart */}
        <div className="space-y-5 lg:col-span-1">
          <Card>
            <h3 className="text-sm font-bold text-gray-900">Views & Clicks (Last 30 Days)</h3>
            <div className="mt-4 h-64">
              {!analytics || analytics.timeSeries.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">No activity yet</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={analytics.timeSeries}>
                    <defs>
                      <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid #f1f5f9' }} />
                    <Area type="monotone" dataKey="views" name="Views" stroke={PRIMARY} strokeWidth={2} fill="url(#viewsFill)" />
                    <Line type="monotone" dataKey="clicks" name="Clicks" stroke={ACCENT} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 flex items-center gap-4 border-t border-gray-100 pt-3 text-xs">
              <span className="flex items-center gap-1.5 text-gray-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIMARY }} /> Views</span>
              <span className="flex items-center gap-1.5 text-gray-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: ACCENT }} /> Clicks</span>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-bold text-gray-900">Delivery Type</h3>
            <p className="mt-2 text-xs text-gray-500">
              Shown as a <span className="font-semibold text-gray-700">{TYPE_META[announcement.type].label}</span> to{' '}
              <span className="font-semibold text-gray-700">{AUDIENCE_META[announcement.targetAudience].label.toLowerCase()}</span>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
