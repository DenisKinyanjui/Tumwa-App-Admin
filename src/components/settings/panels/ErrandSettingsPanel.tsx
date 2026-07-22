import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { ErrandSettingsConfig } from '../../../types'
import SettingsFormShell from '../SettingsFormShell'

const FIELDS: { key: keyof ErrandSettingsConfig; label: string; hint: string }[] = [
  { key: 'maxErrandValue', label: 'Maximum Errand Value (KES)', hint: 'Highest amount a customer can post for a single errand.' },
  { key: 'minErrandValue', label: 'Minimum Errand Value (KES)', hint: 'Lowest amount a customer can post for a single errand.' },
  { key: 'runnerAcceptanceTimeoutMin', label: 'Runner Acceptance Timeout (minutes)', hint: 'How long a runner has to accept an offered errand.' },
  { key: 'customerConfirmationTimeoutHrs', label: 'Customer Confirmation Timeout (hours)', hint: 'How long a customer has to confirm completion before auto-confirm.' },
]

export default function ErrandSettingsPanel() {
  const [draft, setDraft] = useState<ErrandSettingsConfig | null>(null)
  const [savedDraft, setSavedDraft] = useState<ErrandSettingsConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.errandSettings)
        setSavedDraft(s.errandSettings)
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
      const s = await updateSettings({ errandSettings: draft })
      setDraft(s.errandSettings)
      setSavedDraft(s.errandSettings)
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
      icon={ClipboardList}
      title="Errand Settings"
      description="Bounds and timeouts applied to every errand posted on the platform."
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
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {f.label}
              </label>
              <input
                type="number"
                min={0}
                value={draft[f.key]}
                onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400"
              />
              <p className="mt-1 text-xs text-gray-400">{f.hint}</p>
            </div>
          ))}
        </div>
      )}
    </SettingsFormShell>
  )
}
