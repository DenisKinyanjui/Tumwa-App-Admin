import { useEffect, useState } from 'react'
import { WalletCards } from 'lucide-react'
import { fetchSettings, updateSettings } from '../../../services/api'
import type { WalletsSettings } from '../../../types'
import SettingsFormShell from '../SettingsFormShell'
import Switch from '../Switch'

const inputClass =
  'w-full max-w-xs rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400'

function WalletBlock({
  title, hint, enabled, onToggle, fieldLabel, fieldHint, fieldValue, onFieldChange,
}: {
  title: string
  hint: string
  enabled: boolean
  onToggle: (v: boolean) => void
  fieldLabel: string
  fieldHint: string
  fieldValue: number
  onFieldChange: (v: number) => void
}) {
  return (
    <div className="rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          <p className="mt-0.5 text-xs text-gray-400">{hint}</p>
        </div>
        <Switch checked={enabled} onChange={onToggle} />
      </div>
      <div className="mt-3.5">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
          {fieldLabel}
        </label>
        <input
          type="number"
          min={0}
          disabled={!enabled}
          value={fieldValue}
          onChange={(e) => onFieldChange(e.target.value === '' ? 0 : Number(e.target.value))}
          className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
        />
        <p className="mt-1 text-xs text-gray-400">{fieldHint}</p>
      </div>
    </div>
  )
}

export default function WalletsPanel() {
  const [draft, setDraft] = useState<WalletsSettings | null>(null)
  const [savedDraft, setSavedDraft] = useState<WalletsSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setDraft(s.wallets)
        setSavedDraft(s.wallets)
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
      const s = await updateSettings({ wallets: draft })
      setDraft(s.wallets)
      setSavedDraft(s.wallets)
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
      icon={WalletCards}
      title="Wallets"
      description="Controls for the three wallet types on the platform."
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
        <div className="space-y-3">
          <WalletBlock
            title="Customer Wallet"
            hint="In-app balance customers can spend on errands."
            enabled={draft.customerWalletEnabled}
            onToggle={(v) => setDraft({ ...draft, customerWalletEnabled: v })}
            fieldLabel="Max Balance (KES)"
            fieldHint="Ceiling a customer's wallet balance can reach."
            fieldValue={draft.customerWalletMaxBalance}
            onFieldChange={(v) => setDraft({ ...draft, customerWalletMaxBalance: v })}
          />
          <WalletBlock
            title="Escrow"
            hint="Funds held while an errand is in progress."
            enabled={draft.escrowEnabled}
            onToggle={(v) => setDraft({ ...draft, escrowEnabled: v })}
            fieldLabel="Auto-release After (hours)"
            fieldHint="Escrow releases to the runner automatically after this delay."
            fieldValue={draft.escrowAutoReleaseHrs}
            onFieldChange={(v) => setDraft({ ...draft, escrowAutoReleaseHrs: v })}
          />
          <WalletBlock
            title="Runner Earnings"
            hint="Balance runners accumulate from completed errands."
            enabled={draft.runnerEarningsEnabled}
            onToggle={(v) => setDraft({ ...draft, runnerEarningsEnabled: v })}
            fieldLabel="Minimum Withdrawal (KES)"
            fieldHint="Smallest amount a runner can withdraw at once."
            fieldValue={draft.runnerEarningsMinWithdrawal}
            onFieldChange={(v) => setDraft({ ...draft, runnerEarningsMinWithdrawal: v })}
          />
        </div>
      )}
    </SettingsFormShell>
  )
}
