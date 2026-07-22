import { useEffect, useRef, useState } from 'react'
import {
  X, Users, User, Footprints, UserSearch, Settings2, Megaphone as MegaphoneIcon, Radar, BellRing,
  ImagePlus, Trash2, Clock, Send, Save, Bell, Loader2, Search,
} from 'lucide-react'
import type {
  NotificationAudience, NotificationCampaign, NotificationCampaignType, NotificationCampaignUser,
} from '../../types'
import {
  createNotificationCampaign, updateNotificationCampaign, uploadNotificationBanner,
  fetchAudienceCount, fetchUsers, type NotificationCampaignPayload,
} from '../../services/api'

const AUDIENCE_OPTIONS: Array<{ value: NotificationAudience; label: string; icon: typeof Users }> = [
  { value: 'all', label: 'All Users', icon: Users },
  { value: 'customers', label: 'Customers', icon: User },
  { value: 'runners', label: 'Runners', icon: Footprints },
  { value: 'specific', label: 'Specific Users', icon: UserSearch },
]

const TYPE_OPTIONS: Array<{ value: NotificationCampaignType; label: string; icon: typeof Settings2 }> = [
  { value: 'system', label: 'System', icon: Settings2 },
  { value: 'promotion', label: 'Promotion', icon: Radar },
  { value: 'announcement', label: 'Announcement', icon: MegaphoneIcon },
  { value: 'reminder', label: 'Reminder', icon: BellRing },
]

const TITLE_MAX = 100
const MESSAGE_MAX = 500

function isUserObject(u: string | NotificationCampaignUser): u is NotificationCampaignUser {
  return typeof u === 'object'
}

// ── Live mobile preview ──────────────────────────────────────────────────────

function MobilePreview({
  title, message, bannerImageUrl,
}: {
  title: string
  message: string
  bannerImageUrl: string | null
}) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="overflow-hidden rounded-[2rem] border-[6px] border-gray-900 bg-gray-900 shadow-xl">
        <div className="relative aspect-[9/18.5] overflow-hidden rounded-[1.6rem] bg-gradient-to-b from-primary-100 via-primary-50 to-white">
          <div className="flex items-center justify-between px-4 pt-2.5 text-[10px] font-semibold text-gray-700">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gray-700" />
              <span className="h-1.5 w-1.5 rounded-full bg-gray-700" />
            </span>
          </div>

          <div className="mx-2.5 mt-6 overflow-hidden rounded-2xl bg-white/95 shadow-lg ring-1 ring-black/5 backdrop-blur">
            <div className="flex items-start gap-2 px-3 pt-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-600">
                <Bell className="h-3.5 w-3.5 text-white" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Tumwa</span>
                  <span className="text-[10px] text-gray-400">&middot; now</span>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] font-bold text-gray-900">
                  {title.trim() || 'Notification title'}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-gray-600">
                  {message.trim() || 'Your message will appear here as you type.'}
                </p>
              </div>
            </div>
            {bannerImageUrl && (
              <img src={bannerImageUrl} alt="" className="mt-2 h-24 w-full object-cover" />
            )}
            <div className="h-2.5" />
          </div>

          <p className="mt-4 text-center text-[10px] font-medium text-gray-400">Live preview</p>
        </div>
      </div>
    </div>
  )
}

// ── Specific-user picker ──────────────────────────────────────────────────────

function UserPicker({
  selected, onChange,
}: {
  selected: NotificationCampaignUser[]
  onChange: (users: NotificationCampaignUser[]) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NotificationCampaignUser[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setLoading(true)
    const timer = setTimeout(() => {
      fetchUsers({ search: query.trim(), limit: 8 })
        .then((res) => setResults(res.data.users.filter((u) => u.role !== 'admin' && u.role !== 'superadmin')))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const addUser = (u: { _id: string; name: string; phone: string; role: string }) => {
    if (selected.some((s) => s._id === u._id)) return
    onChange([...selected, { _id: u._id, name: u.name, phone: u.phone, role: u.role as NotificationCampaignUser['role'] }])
    setQuery('')
    setOpen(false)
  }

  const removeUser = (id: string) => onChange(selected.filter((u) => u._id !== id))

  return (
    <div className="mt-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name or phone..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
        />
        {open && query.trim() && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute left-0 right-0 top-full z-20 mt-1.5 max-h-52 overflow-y-auto rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
              {loading ? (
                <p className="px-3 py-2.5 text-xs text-gray-400">Searching…</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2.5 text-xs text-gray-400">No matching users</p>
              ) : (
                results.map((u) => (
                  <button
                    key={u._id}
                    onMouseDown={() => addUser(u)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                  >
                    <span>
                      <span className="font-medium text-gray-800">{u.name}</span>
                      <span className="ml-1.5 text-xs text-gray-400">{u.phone}</span>
                    </span>
                    <span className="text-[10px] font-semibold uppercase text-gray-400">{u.role}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((u) => (
            <span key={u._id} className="flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-1.5 text-xs font-medium text-primary-700">
              {u.name}
              <button onClick={() => removeUser(u._id)} className="rounded-full p-0.5 hover:bg-primary-100">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────────────────────

export default function NotificationComposer({
  mode, initial, onClose, onSaved,
}: {
  mode: 'create' | 'edit'
  initial?: NotificationCampaign
  onClose: () => void
  onSaved: (campaign: NotificationCampaign) => void
}) {
  const [audience, setAudience] = useState<NotificationAudience>(initial?.audience ?? 'all')
  const [selectedUsers, setSelectedUsers] = useState<NotificationCampaignUser[]>(
    (initial?.specificUserIds ?? []).filter(isUserObject),
  )
  const [type, setType] = useState<NotificationCampaignType>(initial?.type ?? 'announcement')
  const [title, setTitle] = useState(initial?.title ?? '')
  const [message, setMessage] = useState(initial?.message ?? '')
  const [bannerImageKey, setBannerImageKey] = useState<string | null>(initial?.bannerImageKey ?? null)
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(initial?.bannerImageUrl ?? null)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [delivery, setDelivery] = useState<'now' | 'schedule'>(initial?.scheduledAt ? 'schedule' : 'now')
  const [scheduleAt, setScheduleAt] = useState(
    initial?.scheduledAt ? initial.scheduledAt.slice(0, 16) : '',
  )
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Live recipient count preview
  useEffect(() => {
    if (audience === 'specific' && selectedUsers.length === 0) { setAudienceCount(0); return }
    const timer = setTimeout(() => {
      fetchAudienceCount(audience, selectedUsers.map((u) => u._id))
        .then(setAudienceCount)
        .catch(() => setAudienceCount(null))
    }, 200)
    return () => clearTimeout(timer)
  }, [audience, selectedUsers])

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setBannerUploading(true)
    setError('')
    try {
      const { bannerImageKey: key, bannerImageUrl: url } = await uploadNotificationBanner(file)
      setBannerImageKey(key)
      setBannerImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setBannerUploading(false)
    }
  }

  const isValid = title.trim().length > 0 && message.trim().length > 0
    && (delivery === 'now' || scheduleAt.length > 0)
    && (audience !== 'specific' || selectedUsers.length > 0)

  const buildPayload = (action: 'draft' | 'publish'): NotificationCampaignPayload => ({
    title: title.trim(),
    message: message.trim(),
    bannerImageKey,
    audience,
    specificUserIds: audience === 'specific' ? selectedUsers.map((u) => u._id) : [],
    type,
    action,
    scheduledAt: action === 'publish' && delivery === 'schedule' && scheduleAt
      ? new Date(scheduleAt).toISOString()
      : null,
  })

  const submit = async (action: 'draft' | 'publish') => {
    setSaving(action === 'draft' ? 'draft' : 'send')
    setError('')
    try {
      const payload = buildPayload(action)
      const campaign = mode === 'edit' && initial
        ? await updateNotificationCampaign(initial._id, payload)
        : await createNotificationCampaign(payload)
      onSaved(campaign)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save notification.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl animate-[slideIn_.25s_ease-out]">
        <style>{'@keyframes slideIn { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }'}</style>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {mode === 'create' ? 'New Notification' : 'Edit Notification'}
            </h2>
            <p className="text-xs text-gray-400">Compose a push notification and choose who receives it.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col overflow-y-auto lg:flex-row">
          {/* Form */}
          <div className="flex-1 space-y-6 px-6 py-5">
            {/* Audience */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Audience</label>
                {audienceCount !== null && (
                  <span className="text-[11px] font-semibold text-gray-400">~{audienceCount.toLocaleString()} recipients</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAudience(opt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors ${
                      audience === opt.value
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <opt.icon className="h-4 w-4" strokeWidth={1.75} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {audience === 'specific' && (
                <UserPicker selected={selectedUsers} onChange={setSelectedUsers} />
              )}
            </div>

            {/* Type */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Notification Type</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setType(opt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold capitalize transition-colors ${
                      type === opt.value
                        ? 'border-accent-500 bg-accent-50 text-accent-700'
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <opt.icon className="h-4 w-4" strokeWidth={1.75} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
                <span className="text-[11px] text-gray-400">{title.length}/{TITLE_MAX}</span>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
                placeholder="e.g. Weekend errand discount"
                className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {/* Message */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</label>
                <span className="text-[11px] text-gray-400">{message.length}/{MESSAGE_MAX}</span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MESSAGE_MAX))}
                rows={4}
                placeholder="Write the notification body..."
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {/* Banner image */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Banner Image (optional)</label>
              {bannerUploading ? (
                <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-6 text-gray-400">
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
                  <span className="text-xs font-medium">Uploading…</span>
                </div>
              ) : bannerImageUrl ? (
                <div className="relative overflow-hidden rounded-xl ring-1 ring-gray-200">
                  <img src={bannerImageUrl} alt="Banner preview" className="h-32 w-full object-cover" />
                  <button
                    onClick={() => { setBannerImageKey(null); setBannerImageUrl(null) }}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-6 text-gray-400 transition hover:border-primary-300 hover:text-primary-500"
                >
                  <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-xs font-medium">Click to upload an image</span>
                  <span className="text-[11px] text-gray-300">PNG or JPG, up to 2MB</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>

            {/* Delivery */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Delivery</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setDelivery('now')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    delivery === 'now' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Send className="h-4 w-4" strokeWidth={1.75} />
                  Send Now
                </button>
                <button
                  onClick={() => setDelivery('schedule')}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                    delivery === 'schedule' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <Clock className="h-4 w-4" strokeWidth={1.75} />
                  Schedule for later
                </button>
              </div>
              {delivery === 'schedule' && (
                <input
                  type="datetime-local"
                  value={scheduleAt}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="shrink-0 border-t border-gray-100 bg-gray-50/70 px-6 py-6 lg:w-[300px] lg:border-l lg:border-t-0">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-gray-400">Live Preview</p>
            <MobilePreview title={title} message={message} bannerImageUrl={bannerImageUrl} />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700 ring-1 ring-red-100">
            {error}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving !== null}
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => submit('draft')}
            disabled={!title.trim() || !message.trim() || saving !== null || bannerUploading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
            Save Draft
          </button>
          <button
            onClick={() => submit('publish')}
            disabled={!isValid || saving !== null || bannerUploading}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {saving === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : delivery === 'schedule' ? <Clock className="h-4 w-4" strokeWidth={1.75} /> : <Send className="h-4 w-4" strokeWidth={1.75} />}
            {delivery === 'schedule' ? 'Schedule Notification' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  )
}
