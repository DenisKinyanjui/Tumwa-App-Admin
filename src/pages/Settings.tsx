import { useEffect, useState } from 'react'
import { FileText, Save } from 'lucide-react'
import { fetchTerms, updateTerms } from '../services/api'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

export default function Settings() {
  const [content, setContent] = useState('')
  const [version, setVersion] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchTerms()
      .then((t) => {
        setContent(t.content)
        setVersion(t.version)
        setUpdatedAt(t.updatedAt)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Settings</h2>
        <p className="mt-0.5 text-sm text-gray-500">App-wide content and configuration</p>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
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
