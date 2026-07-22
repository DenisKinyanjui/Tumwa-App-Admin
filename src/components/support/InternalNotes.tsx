import { useState } from 'react'
import { StickyNote, Send } from 'lucide-react'
import type { SupportInternalNote } from '../../types'

interface InternalNotesProps {
  notes: SupportInternalNote[]
  onAdd: (note: string) => Promise<void>
}

const adminName = (adminId: SupportInternalNote['adminId']) =>
  typeof adminId === 'string' ? 'Admin' : adminId.name

export default function InternalNotes({ notes, onAdd }: InternalNotesProps) {
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAdd = async () => {
    if (!text.trim() || saving) return
    setSaving(true)
    try {
      await onAdd(text.trim())
      setText('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <StickyNote className="h-3.5 w-3.5" />
        Internal Notes
      </div>

      <div className="space-y-2">
        {notes.length === 0 && <p className="text-xs text-gray-400">No notes yet — visible only to admins.</p>}
        {notes.map((n) => (
          <div key={n._id} className="rounded-xl bg-amber-50 px-3 py-2">
            <p className="whitespace-pre-wrap break-words text-xs text-gray-700">{n.note}</p>
            <p className="mt-1 text-[10px] text-gray-400">
              {adminName(n.adminId)} · {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-end gap-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note (admins only)..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !text.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
