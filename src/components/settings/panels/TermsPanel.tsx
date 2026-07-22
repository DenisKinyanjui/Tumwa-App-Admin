import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { fetchTerms, updateTerms } from '../../../services/api'
import SettingsFormShell from '../SettingsFormShell'

export default function TermsPanel() {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
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
        setSavedContent(t.content)
        setVersion(t.version)
        setUpdatedAt(t.updatedAt)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const dirty = content !== savedContent

  const handleCancel = () => {
    setContent(savedContent)
    setError('')
    setSaved(false)
  }

  const handleSave = async () => {
    if (!content.trim()) { setError('Terms & conditions content cannot be empty.'); return }
    setError('')
    setSaved(false)
    setSaving(true)
    try {
      const t = await updateTerms(content)
      setContent(t.content)
      setSavedContent(t.content)
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
    <SettingsFormShell
      icon={FileText}
      title="Terms & Conditions"
      description={'This text is shown to users in the mobile app when they tap "terms & conditions" during registration.'}
      meta={!loading ? `v${version}` : undefined}
      updatedAt={updatedAt}
      dirty={dirty}
      loading={loading}
      saving={saving}
      saved={saved}
      error={error}
      onSave={handleSave}
      onCancel={handleCancel}
    >
      <textarea
        rows={16}
        value={content}
        onChange={(e) => { setContent(e.target.value); setSaved(false) }}
        placeholder="Enter the terms & conditions text shown to users…"
        className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 outline-none focus:border-primary-400"
      />
    </SettingsFormShell>
  )
}
