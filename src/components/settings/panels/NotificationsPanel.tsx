import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { NotificationsSettings } from '../../../types'
import SettingsFormShell from '../SettingsFormShell'
import Switch from '../Switch'

function ToggleRow({
  label, hint, checked, onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

export default function NotificationsPanel() {
  const [draft, setDraft] = useState<NotificationsSettings | null>(null)
  const [savedDraft, setSavedDraft] = useState<NotificationsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.notifications)
        setSavedDraft(s.notifications)
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
      const s = await updateSettings({ notifications: draft })
      setDraft(s.notifications)
      setSavedDraft(s.notifications)
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
      icon={Bell}
      title="Notifications"
      description="Default delivery channels for platform notifications."
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
        <div className="space-y-2.5">
          <ToggleRow
            label="Push Notifications"
            hint="Deliver notifications to the mobile app's OS tray."
            checked={draft.pushEnabled}
            onChange={(v) => setDraft({ ...draft, pushEnabled: v })}
          />
          <ToggleRow
            label="SMS"
            hint="Deliver critical alerts via SMS as a fallback channel."
            checked={draft.smsEnabled}
            onChange={(v) => setDraft({ ...draft, smsEnabled: v })}
          />
          <ToggleRow
            label="Email"
            hint="Deliver receipts and summaries via email."
            checked={draft.emailEnabled}
            onChange={(v) => setDraft({ ...draft, emailEnabled: v })}
          />
        </div>
      )}
    </SettingsFormShell>
  )
}
