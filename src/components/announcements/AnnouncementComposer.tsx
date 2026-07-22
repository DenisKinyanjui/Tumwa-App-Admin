import { useEffect, useRef, useState } from 'react'
import {
  X, ImagePlus, Trash2, Loader2, Save, Rocket, Search, AppWindow, PanelTop, PanelBottom,
  XCircle, ExternalLink, Navigation, LifeBuoy, MapPin,
} from 'lucide-react'
import type {
  Announcement, AnnouncementAudience, AnnouncementTrigger, AnnouncementType, AnnouncementButtonAction,
  AnnouncementPriority, AnnouncementDisplayFrequency, NotificationCampaignUser, AnnouncementLocation, ServiceArea,
} from '../../types'
import {
  createAnnouncement, updateAnnouncement, uploadAnnouncementImage, fetchUsers, fetchServiceAreas,
  type AnnouncementPayload,
} from '../../services/api'
import { AUDIENCE_META, TRIGGER_META, INTERNAL_ROUTE_CATALOG } from './announcementMeta'

const TYPE_OPTIONS: Array<{ value: AnnouncementType; label: string; icon: typeof AppWindow }> = [
  { value: 'modal', label: 'Modal', icon: AppWindow },
  { value: 'top_banner', label: 'Top Banner', icon: PanelTop },
  { value: 'bottom_sheet', label: 'Bottom Sheet', icon: PanelBottom },
]

const ACTION_OPTIONS: Array<{ value: AnnouncementButtonAction; label: string; icon: typeof XCircle }> = [
  { value: 'close', label: 'Close', icon: XCircle },
  { value: 'external_url', label: 'External URL', icon: ExternalLink },
  { value: 'internal_screen', label: 'Internal Screen', icon: Navigation },
  { value: 'contact_support', label: 'Contact Support', icon: LifeBuoy },
]

const PRIORITY_OPTIONS: Array<{ value: AnnouncementPriority; label: string; onClassName: string }> = [
  { value: 'low', label: 'Low', onClassName: 'border-gray-400 bg-gray-50 text-gray-700' },
  { value: 'normal', label: 'Normal', onClassName: 'border-primary-500 bg-primary-50 text-primary-700' },
  { value: 'high', label: 'High', onClassName: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'critical', label: 'Critical', onClassName: 'border-red-400 bg-red-50 text-red-700' },
]

const FREQUENCY_OPTIONS: Array<{ value: AnnouncementDisplayFrequency; label: string }> = [
  { value: 'once_ever', label: 'Once Ever' },
  { value: 'once_per_version', label: 'Once Per App Version' },
  { value: 'once_per_session', label: 'Once Per Session' },
  { value: 'every_trigger', label: 'Every Trigger' },
  { value: 'until_dismissed', label: 'Until Dismissed' },
]

const TITLE_MAX = 100
const SUBTITLE_MAX = 150
const DESCRIPTION_MAX = 1000

function isUserObject(u: string | NotificationCampaignUser): u is NotificationCampaignUser {
  return typeof u === 'object'
}
function isLocationObject(l: string | AnnouncementLocation): l is AnnouncementLocation {
  return typeof l === 'object'
}

function toLocalInput(iso: string) {
  return iso.slice(0, 16)
}

// ── Specific-user picker (mirrors NotificationComposer's) ────────────────────

function UserPicker({ selected, onChange }: { selected: NotificationCampaignUser[]; onChange: (u: NotificationCampaignUser[]) => void }) {
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
                  <button key={u._id} onMouseDown={() => addUser(u)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50">
                    <span><span className="font-medium text-gray-800">{u.name}</span><span className="ml-1.5 text-xs text-gray-400">{u.phone}</span></span>
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
              <button onClick={() => onChange(selected.filter((s) => s._id !== u._id))} className="rounded-full p-0.5 hover:bg-primary-100"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Location checklist ────────────────────────────────────────────────────────

function LocationPicker({ selected, onChange }: { selected: AnnouncementLocation[]; onChange: (l: AnnouncementLocation[]) => void }) {
  const [areas, setAreas] = useState<ServiceArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchServiceAreas().then(setAreas).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const toggle = (area: ServiceArea) => {
    const exists = selected.some((s) => s._id === area._id)
    onChange(exists ? selected.filter((s) => s._id !== area._id) : [...selected, { _id: area._id, name: area.name, region: area.region }])
  }

  return (
    <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-2">
      {loading ? (
        <p className="px-2 py-2 text-xs text-gray-400">Loading zones…</p>
      ) : areas.length === 0 ? (
        <p className="px-2 py-2 text-xs text-gray-400">No service areas configured yet.</p>
      ) : (
        areas.map((area) => {
          const checked = selected.some((s) => s._id === area._id)
          return (
            <button
              key={area._id}
              onClick={() => toggle(area)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${checked ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{area.name}</span>
              <span className="text-xs text-gray-400">{area.region}</span>
            </button>
          )
        })
      )}
    </div>
  )
}

// ── Composer ──────────────────────────────────────────────────────────────────

export default function AnnouncementComposer({
  mode, initial, onClose, onSaved,
}: {
  mode: 'create' | 'edit'
  initial?: Announcement
  onClose: () => void
  onSaved: (announcement: Announcement) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [imageKey, setImageKey] = useState<string | null>(initial?.image ?? null)
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.imageUrl ?? null)
  const [imageUploading, setImageUploading] = useState(false)
  const [type, setType] = useState<AnnouncementType>(initial?.type ?? 'modal')

  const [audience, setAudience] = useState<AnnouncementAudience>(initial?.targetAudience ?? 'everyone')
  const [selectedUsers, setSelectedUsers] = useState<NotificationCampaignUser[]>((initial?.selectedUsers ?? []).filter(isUserObject))
  const [selectedLocations, setSelectedLocations] = useState<AnnouncementLocation[]>((initial?.selectedLocations ?? []).filter(isLocationObject))

  const [triggers, setTriggers] = useState<AnnouncementTrigger[]>(initial?.triggers ?? ['app_launch'])
  const [customEventName, setCustomEventName] = useState(initial?.customEventName ?? '')

  const [primaryButtonText, setPrimaryButtonText] = useState(initial?.primaryButtonText ?? '')
  const [secondaryButtonText, setSecondaryButtonText] = useState(initial?.secondaryButtonText ?? '')
  const [primaryAction, setPrimaryAction] = useState<AnnouncementButtonAction>(initial?.primaryAction ?? 'close')
  const [actionTarget, setActionTarget] = useState(initial?.actionTarget ?? '')

  const [priority, setPriority] = useState<AnnouncementPriority>(initial?.priority ?? 'normal')
  const [displayFrequency, setDisplayFrequency] = useState<AnnouncementDisplayFrequency>(initial?.displayFrequency ?? 'once_ever')

  const [startDate, setStartDate] = useState(initial ? toLocalInput(initial.startDate) : '')
  const [endDate, setEndDate] = useState(initial ? toLocalInput(initial.endDate) : '')

  const [saving, setSaving] = useState<'draft' | 'activate' | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setImageUploading(true)
    setError('')
    try {
      const { imageKey: key, imageUrl: url } = await uploadAnnouncementImage(file)
      setImageKey(key)
      setImageUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image.')
    } finally {
      setImageUploading(false)
    }
  }

  const toggleTrigger = (t: AnnouncementTrigger) => {
    setTriggers((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const needsActionTarget = primaryAction === 'external_url' || primaryAction === 'internal_screen'

  const isValid = title.trim().length > 0
    && description.trim().length > 0
    && triggers.length > 0
    && startDate.length > 0 && endDate.length > 0
    && new Date(endDate) > new Date(startDate)
    && (audience !== 'selected_users' || selectedUsers.length > 0)
    && (audience !== 'selected_locations' || selectedLocations.length > 0)
    && (!needsActionTarget || actionTarget.trim().length > 0)

  const buildPayload = (activate: boolean): AnnouncementPayload => ({
    title: title.trim(),
    subtitle: subtitle.trim() || null,
    description: description.trim(),
    image: imageKey,
    type,
    targetAudience: audience,
    selectedUsers: audience === 'selected_users' ? selectedUsers.map((u) => u._id) : [],
    selectedLocations: audience === 'selected_locations' ? selectedLocations.map((l) => l._id) : [],
    triggers,
    customEventName: triggers.includes('custom_event') ? customEventName.trim() || null : null,
    primaryButtonText: primaryButtonText.trim() || null,
    secondaryButtonText: secondaryButtonText.trim() || null,
    primaryAction,
    actionTarget: needsActionTarget ? actionTarget.trim() : null,
    priority,
    displayFrequency,
    startDate: new Date(startDate).toISOString(),
    endDate: new Date(endDate).toISOString(),
    activate,
  })

  const submit = async (activate: boolean) => {
    setSaving(activate ? 'activate' : 'draft')
    setError('')
    try {
      const payload = buildPayload(activate)
      const announcement = mode === 'edit' && initial
        ? await updateAnnouncement(initial._id, payload)
        : await createAnnouncement(payload)
      onSaved(announcement)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save announcement.')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-[slideIn_.25s_ease-out]">
        <style>{'@keyframes slideIn { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }'}</style>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">{mode === 'create' ? 'New Announcement' : 'Edit Announcement'}</h2>
            <p className="text-xs text-gray-400">Configure an in-app modal, banner or bottom sheet.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Content */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              placeholder="e.g. New feature: Live errand tracking"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Subtitle (optional)</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value.slice(0, SUBTITLE_MAX))}
              placeholder="e.g. Track your runner in real time"
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Description</label>
              <span className="text-[11px] text-gray-400">{description.length}/{DESCRIPTION_MAX}</span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
              rows={4}
              placeholder="Describe what's new or important..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Banner / Image (optional)</label>
            {imageUploading ? (
              <div className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-6 text-gray-400">
                <Loader2 className="h-5 w-5 animate-spin" /><span className="text-xs font-medium">Uploading…</span>
              </div>
            ) : imageUrl ? (
              <div className="relative overflow-hidden rounded-xl ring-1 ring-gray-200">
                <img src={imageUrl} alt="Preview" className="h-32 w-full object-cover" />
                <button onClick={() => { setImageKey(null); setImageUrl(null) }} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-red-500 shadow transition hover:bg-white">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-gray-200 py-6 text-gray-400 transition hover:border-primary-300 hover:text-primary-500">
                <ImagePlus className="h-5 w-5" strokeWidth={1.5} />
                <span className="text-xs font-medium">Click to upload an image</span>
                <span className="text-[11px] text-gray-300">PNG or JPG, up to 2MB</span>
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>

          {/* Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">Type</label>
            <div className="grid grid-cols-3 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors ${type === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <opt.icon className="h-4 w-4" strokeWidth={1.75} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Target Audience</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(AUDIENCE_META).map(([value, meta]) => (
                <button
                  key={value}
                  onClick={() => setAudience(value as AnnouncementAudience)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2.5 py-3 text-[11px] font-semibold leading-tight transition-colors ${audience === value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <meta.icon className="h-4 w-4" strokeWidth={1.75} />
                  <span className="text-center">{meta.label}</span>
                </button>
              ))}
            </div>
            {audience === 'selected_users' && <UserPicker selected={selectedUsers} onChange={setSelectedUsers} />}
            {audience === 'selected_locations' && <LocationPicker selected={selectedLocations} onChange={setSelectedLocations} />}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Triggers</p>
            <p className="mt-0.5 text-xs text-gray-400">Select every lifecycle moment that should check for this announcement.</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(TRIGGER_META).map(([value, meta]) => {
                const on = triggers.includes(value as AnnouncementTrigger)
                return (
                  <button
                    key={value}
                    onClick={() => toggleTrigger(value as AnnouncementTrigger)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2.5 py-3 text-[11px] font-semibold leading-tight transition-colors ${on ? 'border-accent-500 bg-accent-50 text-accent-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    <meta.icon className="h-4 w-4" strokeWidth={1.75} />
                    <span className="text-center">{meta.label}</span>
                  </button>
                )
              })}
            </div>
            {triggers.includes('custom_event') && (
              <input
                value={customEventName}
                onChange={(e) => setCustomEventName(e.target.value)}
                placeholder="Custom event name, e.g. promo_banner_seen"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            )}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Buttons</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Primary Button Text</label>
                <input value={primaryButtonText} onChange={(e) => setPrimaryButtonText(e.target.value.slice(0, 40))} placeholder="Got it"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Secondary Button Text (optional)</label>
                <input value={secondaryButtonText} onChange={(e) => setSecondaryButtonText(e.target.value.slice(0, 40))} placeholder="Maybe later"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
              </div>
            </div>

            <label className="mb-2 mt-3 block text-[11px] font-semibold text-gray-500">Primary Button Action</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPrimaryAction(opt.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2.5 py-3 text-[11px] font-semibold transition-colors ${primaryAction === opt.value ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <opt.icon className="h-4 w-4" strokeWidth={1.75} />
                  {opt.label}
                </button>
              ))}
            </div>

            {primaryAction === 'external_url' && (
              <input
                value={actionTarget}
                onChange={(e) => setActionTarget(e.target.value)}
                placeholder="https://tumwa.app/whats-new"
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            )}
            {primaryAction === 'internal_screen' && (
              <select
                value={actionTarget}
                onChange={(e) => setActionTarget(e.target.value)}
                className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Select a screen...</option>
                {INTERNAL_ROUTE_CATALOG.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-700">Display Rules</p>

            <label className="mb-2 mt-2 block text-[11px] font-semibold text-gray-500">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPriority(opt.value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition-colors ${priority === opt.value ? opt.onClassName : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <label className="mb-1 mt-3 block text-[11px] font-semibold text-gray-500">Display Frequency</label>
            <select
              value={displayFrequency}
              onChange={(e) => setDisplayFrequency(e.target.value as AnnouncementDisplayFrequency)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              {FREQUENCY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">Start Date/Time</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-500">End Date/Time</label>
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100" />
              </div>
            </div>
          </div>
        </div>

        {error && <div className="mx-6 mb-2 rounded-xl bg-red-50 px-3.5 py-2.5 text-xs text-red-700 ring-1 ring-red-100">{error}</div>}

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button onClick={onClose} disabled={saving !== null} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={() => submit(false)}
            disabled={!title.trim() || !description.trim() || saving !== null || imageUploading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {saving === 'draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" strokeWidth={1.75} />}
            Save Draft
          </button>
          <button
            onClick={() => submit(true)}
            disabled={!isValid || saving !== null || imageUploading}
            className="flex items-center gap-1.5 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {saving === 'activate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" strokeWidth={1.75} />}
            Save & Activate
          </button>
        </div>
      </div>
    </div>
  )
}
