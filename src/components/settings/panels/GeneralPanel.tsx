import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { GeneralSettings } from '../../../types'
import SettingsFormShell from '../SettingsFormShell'

const COUNTRIES = ['Kenya', 'Uganda', 'Tanzania', 'Rwanda']
const TIMEZONES = ['Africa/Nairobi', 'Africa/Kampala', 'Africa/Dar_es_Salaam', 'Africa/Kigali']

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400'
const labelClass = 'mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500'

export default function GeneralPanel() {
  const [draft, setDraft] = useState<GeneralSettings | null>(null)
  const [savedDraft, setSavedDraft] = useState<GeneralSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.general)
        setSavedDraft(s.general)
        setUpdatedAt(s.updatedAt)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dirty = !!draft && !!savedDraft && JSON.stringify(draft) !== JSON.stringify(savedDraft)

  const handleCancel = () => {
    if (savedDraft) setDraft(savedDraft)
    setError('')
    setSaved(false)
  }

  const handleSave = async () => {
    if (!draft) return
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const s = await updateSettings({ general: draft })
      setDraft(s.general)
      setSavedDraft(s.general)
      setUpdatedAt(s.updatedAt)
      setSaved(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFormShell
      icon={SlidersHorizontal}
      title="General"
      description="Core identity and contact details for the platform."
      updatedAt={updatedAt}
      dirty={dirty}
      loading={loading}
      saving={saving}
      saved={saved}
      error={error}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      {draft && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Platform Name</label>
            <input
              type="text"
              value={draft.platformName}
              onChange={(e) => setDraft({ ...draft, platformName: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Support Email</label>
            <input
              type="email"
              value={draft.supportEmail}
              onChange={(e) => setDraft({ ...draft, supportEmail: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Support Phone</label>
            <input
              type="text"
              value={draft.supportPhone}
              onChange={(e) => setDraft({ ...draft, supportPhone: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Country</label>
            <select
              value={draft.country}
              onChange={(e) => setDraft({ ...draft, country: e.target.value })}
              className={inputClass}
            >
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select
              value={draft.timezone}
              onChange={(e) => setDraft({ ...draft, timezone: e.target.value })}
              className={inputClass}
            >
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </div>
        </div>
      )}
    </SettingsFormShell>
  )
}
