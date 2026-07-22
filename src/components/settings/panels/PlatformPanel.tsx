import { useEffect, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { PlatformSettings } from '../../../types'
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

export default function PlatformPanel() {
  const [draft, setDraft] = useState<PlatformSettings | null>(null)
  const [savedDraft, setSavedDraft] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.platform)
        setSavedDraft(s.platform)
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
      const s = await updateSettings({ platform: draft })
      setDraft(s.platform)
      setSavedDraft(s.platform)
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
      icon={Globe2}
      title="Platform"
      description="Platform-wide toggles governing registration and verification requirements."
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
            label="Runner Registration"
            hint="Allow new runners to sign up on the platform."
            checked={draft.runnerRegistrationOpen}
            onChange={(v) => setDraft({ ...draft, runnerRegistrationOpen: v })}
          />
          <ToggleRow
            label="Identity Verification Required"
            hint="Runners must pass KYC review before accepting errands."
            checked={draft.identityVerificationRequired}
            onChange={(v) => setDraft({ ...draft, identityVerificationRequired: v })}
          />
          <ToggleRow
            label="Phone Verification Required"
            hint="New accounts must confirm their phone number via OTP."
            checked={draft.phoneVerificationRequired}
            onChange={(v) => setDraft({ ...draft, phoneVerificationRequired: v })}
          />
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Platform Commission (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={draft.platformCommission}
              onChange={(e) => setDraft({ ...draft, platformCommission: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="w-full max-w-xs rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400"
            />
            <p className="mt-1 text-xs text-gray-400">Share of each errand's value retained by the platform.</p>
          </div>
        </div>
      )}
    </SettingsFormShell>
  )
}
