import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { WorkingCapitalSettings } from '../../../types'
import SettingsFormShell from '../SettingsFormShell'

const FIELD_META: { key: keyof WorkingCapitalSettings; label: string; hint: string; step?: string }[] = [
  { key: 'defaultLimit', label: 'Default starting limit (KES)', hint: 'What every new runner starts with.' },
  { key: 'maxLimit', label: 'Absolute max limit (KES)', hint: 'Ceiling no runner\'s limit can exceed.' },
  { key: 'increaseStep', label: 'Increase step (KES)', hint: 'Amount the limit steps up on a qualifying completion.' },
  { key: 'decreaseStep', label: 'Decrease step (KES)', hint: 'Amount deducted for an at-fault cancellation/dispute.' },
  { key: 'increaseCheckInterval', label: 'Increase check interval (errands)', hint: 'Only check for an increase every N completed errands.' },
  { key: 'minRatingForIncrease', label: 'Min rating for increase', hint: 'Rating (0–5) required to qualify for an increase.', step: '0.1' },
  { key: 'maxDisputeRateForIncrease', label: 'Max dispute rate for increase', hint: 'Dispute rate (0–1) ceiling to qualify for an increase.', step: '0.01' },
]

export default function WorkingCapitalPanel() {
  const [wc, setWc] = useState<WorkingCapitalSettings | null>(null)
  const [savedWc, setSavedWc] = useState<WorkingCapitalSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setWc(s.workingCapital)
        setSavedWc(s.workingCapital)
        setUpdatedAt(s.updatedAt)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dirty = !!wc && !!savedWc && JSON.stringify(wc) !== JSON.stringify(savedWc)

  const handleChange = (key: keyof WorkingCapitalSettings, value: string) => {
    if (!wc) return
    setWc({ ...wc, [key]: value === '' ? 0 : Number(value) })
    setSaved(false)
  }

  const handleCancel = () => {
    if (savedWc) setWc(savedWc)
    setError('')
    setSaved(false)
  }

  const handleSave = async () => {
    if (!wc) return
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const s = await updateSettings({ workingCapital: wc })
      setWc(s.workingCapital)
      setSavedWc(s.workingCapital)
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
      icon={Wallet}
      title="Working Capital"
      description="Controls the runner risk/trust limit used by the matching engine — not a wallet balance, never withdrawable. Changes apply immediately to all future limit recalculations."
      updatedAt={updatedAt}
      dirty={dirty}
      loading={loading}
      saving={saving}
      saved={saved}
      error={error}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      {wc && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {FIELD_META.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                {f.label}
              </label>
              <input
                type="number"
                min={0}
                step={f.step ?? '1'}
                value={wc[f.key]}
                onChange={(e) => handleChange(f.key, e.target.value)}
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
