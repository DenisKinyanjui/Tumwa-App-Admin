import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { FileText, Save, Wallet } from 'lucide-react'
import { fetchTerms, updateTerms, fetchSettings, updateSettings } from '../services/api'
import type { WorkingCapitalSettings } from '../types'
import type { LayoutOutletContext } from '../layouts/AdminLayout'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

const FIELD_META: { key: keyof WorkingCapitalSettings; label: string; hint: string; step?: string }[] = [
  { key: 'defaultLimit', label: 'Default starting limit (KES)', hint: 'What every new runner starts with.' },
  { key: 'maxLimit', label: 'Absolute max limit (KES)', hint: 'Ceiling no runner\'s limit can exceed.' },
  { key: 'increaseStep', label: 'Increase step (KES)', hint: 'Amount the limit steps up on a qualifying completion.' },
  { key: 'decreaseStep', label: 'Decrease step (KES)', hint: 'Amount deducted for an at-fault cancellation/dispute.' },
  { key: 'increaseCheckInterval', label: 'Increase check interval (errands)', hint: 'Only check for an increase every N completed errands.' },
  { key: 'minRatingForIncrease', label: 'Min rating for increase', hint: 'Rating (0–5) required to qualify for an increase.', step: '0.1' },
  { key: 'maxDisputeRateForIncrease', label: 'Max dispute rate for increase', hint: 'Dispute rate (0–1) ceiling to qualify for an increase.', step: '0.01' },
]

export default function Settings() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const [content, setContent] = useState('')
  const [version, setVersion] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [wc, setWc] = useState<WorkingCapitalSettings | null>(null)
  const [wcLoading, setWcLoading] = useState(true)
  const [wcSaving, setWcSaving] = useState(false)
  const [wcError, setWcError] = useState('')
  const [wcSaved, setWcSaved] = useState(false)
  const [wcUpdatedAt, setWcUpdatedAt] = useState<string | null>(null)

  useEffect(() => {
    fetchTerms()
      .then((t) => {
        setContent(t.content)
        setVersion(t.version)
        setUpdatedAt(t.updatedAt)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))

    fetchSettings()
      .then((s) => {
        setWc(s.workingCapital)
        setWcUpdatedAt(s.updatedAt)
      })
      .catch((e: Error) => setWcError(e.message))
      .finally(() => setWcLoading(false))
  }, [])

  useEffect(() => {
    setSubtitle('App-wide content and configuration')
  }, [setSubtitle])

  const handleSave = async () => {
    if (!content.trim()) { setError('Terms & conditions content cannot be empty.'); return }
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const t = await updateTerms(content)
      setVersion(t.version)
      setUpdatedAt(t.updatedAt)
      setSaved(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleWcChange = (key: keyof WorkingCapitalSettings, value: string) => {
    if (!wc) return
    setWc({ ...wc, [key]: value === '' ? 0 : Number(value) })
    setWcSaved(false)
  }

  const handleWcSave = async () => {
    if (!wc) return
    setWcError('')
    setWcSaved(false)
    setWcSaving(true)
    try {
      const s = await updateSettings(wc)
      setWc(s.workingCapital)
      setWcUpdatedAt(s.updatedAt)
      setWcSaved(true)
    } catch (e: any) {
      setWcError(e.message)
    } finally {
      setWcSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900">Working Capital</h3>
          </div>
          {!wcLoading && wcUpdatedAt && (
            <p className="text-xs text-gray-400">updated {fmtDateTime(wcUpdatedAt)}</p>
          )}
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-xs text-gray-500">
            Controls the runner risk/trust limit used by the matching engine — not a wallet balance,
            never withdrawable. Changes apply immediately to all future limit recalculations.
          </p>

          {wcError && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{wcError}</p>
          )}
          {wcSaved && !wcError && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</p>
          )}

          {wcLoading || !wc ? (
            <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ) : (
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
                    onChange={(e) => handleWcChange(f.key, e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-primary-400"
                  />
                  <p className="mt-1 text-xs text-gray-400">{f.hint}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleWcSave}
              disabled={wcSaving || wcLoading}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {wcSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-900">Terms & Conditions</h3>
          </div>
          {!loading && (
            <p className="text-xs text-gray-400">
              v{version}{updatedAt ? ` · updated ${fmtDateTime(updatedAt)}` : ''}
            </p>
          )}
        </div>

        <div className="space-y-3 px-6 py-5">
          <p className="text-xs text-gray-500">
            This text is shown to users in the mobile app when they tap "terms & conditions" during registration.
          </p>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}
          {saved && !error && (
            <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</p>
          )}

          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
          ) : (
            <textarea
              rows={16}
              value={content}
              onChange={(e) => { setContent(e.target.value); setSaved(false) }}
              placeholder="Enter the terms & conditions text shown to users…"
              className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-primary-400"
            />
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
