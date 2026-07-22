import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { AuthenticationSettings } from '../../../types'
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

export default function AuthenticationPanel() {
  const [draft, setDraft] = useState<AuthenticationSettings | null>(null)
  const [savedDraft, setSavedDraft] = useState<AuthenticationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.authentication)
        setSavedDraft(s.authentication)
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
      const s = await updateSettings({ authentication: draft })
      setDraft(s.authentication)
      setSavedDraft(s.authentication)
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
      icon={KeyRound}
      title="Authentication"
      description="Account security requirements for users and admins."
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
            label="Require Phone Verification"
            hint="New accounts must confirm their phone number via OTP before use."
            checked={draft.requirePhoneVerification}
            onChange={(v) => setDraft({ ...draft, requirePhoneVerification: v })}
          />
          <ToggleRow
            label="Require Identity Verification"
            hint="Runners must pass KYC review before accepting errands."
            checked={draft.requireIdentityVerification}
            onChange={(v) => setDraft({ ...draft, requireIdentityVerification: v })}
          />
          <ToggleRow
            label="Enable Admin 2FA"
            hint="Require a second factor when admins sign in to this portal."
            checked={draft.adminTwoFactorEnabled}
            onChange={(v) => setDraft({ ...draft, adminTwoFactorEnabled: v })}
          />
        </div>
      )}
    </SettingsFormShell>
  )
}
