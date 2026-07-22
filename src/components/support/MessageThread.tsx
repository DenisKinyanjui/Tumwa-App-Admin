import { useEffect, useMemo, useRef } from 'react'
import MessageBubble from './MessageBubble'
import type { SupportMessage } from '../../types'

interface MessageThreadProps {
  messages: SupportMessage[]
  currentUserId: string
  requesterId: string
  typing: boolean
  loading: boolean
}

type Row = { kind: 'date'; label: string; key: string } | { kind: 'message'; message: SupportMessage }

const dateLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

export default function MessageThread({ messages, currentUserId, requesterId, typing, loading }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    let lastDate: string | null = null
    for (const m of messages) {
      const label = dateLabel(m.createdAt)
      if (label !== lastDate) {
        out.push({ kind: 'date', label, key: `date-${m._id}` })
        lastDate = label
      }
      out.push({ kind: 'message', message: m })
    }
    return out
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  if (loading) {
    return (
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="h-10 w-1/3 animate-pulse rounded-2xl bg-gray-100" />
          </div>
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center text-gray-400">
        <p className="text-sm font-medium">No messages yet</p>
        <p className="text-xs">Send the first reply below.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#F8FAFC] py-4">
      {rows.map((row) =>
        row.kind === 'date' ? (
          <div key={row.key} className="my-3 flex justify-center">
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-gray-400 shadow-sm ring-1 ring-gray-100">
              {row.label}
            </span>
          </div>
        ) : (
          <MessageBubble
            key={row.message._id}
            message={row.message}
            own={row.message.senderId === currentUserId}
            read={row.message.readBy.some((r) => r.user === requesterId)}
          />
        ),
      )}

      {typing && (
        <div className="flex justify-start px-4 py-1">
          <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 shadow-sm ring-1 ring-gray-100">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.3s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300 [animation-delay:-0.15s]" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-300" />
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
