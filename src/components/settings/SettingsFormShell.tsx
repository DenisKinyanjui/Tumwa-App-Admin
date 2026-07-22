import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'
import { Save } from 'lucide-react'

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

export default function SettingsFormShell({
  icon: Icon,
  title,
  description,
  meta,
  updatedAt,
  dirty,
  loading,
  saving,
  saved,
  error,
  onSave,
  onCancel,
  children,
}: {
  icon: ComponentType<LucideProps>
  title: string
  description: string
  // Extra text shown next to the "updated" timestamp, e.g. a version badge.
  meta?: ReactNode
  updatedAt?: string | null
  dirty: boolean
  loading?: boolean
  saving: boolean
  saved: boolean
  error?: string
  onSave: () => void
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Icon className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        </div>
        <div className="flex items-center gap-2.5">
          {dirty && !loading && (
            <span className="flex items-center gap-1.5 rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold text-accent-600">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              Unsaved changes
            </span>
          )}
          {!loading && (meta || updatedAt) && (
            <p className="text-xs text-gray-400">
              {meta}
              {meta && updatedAt ? ' · ' : ''}
              {updatedAt ? `updated ${fmtDateTime(updatedAt)}` : ''}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        <p className="text-xs text-gray-500">{description}</p>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}
        {saved && !error && !dirty && (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">Saved.</p>
        )}

        {loading ? (
          <div className="h-48 animate-pulse rounded-xl bg-gray-100" />
        ) : (
          children
        )}

        {!loading && (
          <div className="flex justify-end gap-2 pt-1">
            {dirty && (
              <button
                onClick={onCancel}
                disabled={saving}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              onClick={onSave}
              disabled={saving || !dirty}
              className="flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
