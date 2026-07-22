import { Check, CheckCheck, FileText } from 'lucide-react'
import type { SupportMessage } from '../../types'

interface MessageBubbleProps {
  message: SupportMessage
  own: boolean
  read: boolean
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

export default function MessageBubble({ message, own, read }: MessageBubbleProps) {
  if (message.messageType === 'system') {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">{message.message}</span>
      </div>
    )
  }

  return (
    <div className={`flex ${own ? 'justify-end' : 'justify-start'} px-4 py-1`}>
      <div
        className={`max-w-[65%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
          own ? 'rounded-br-sm bg-primary-500 text-white' : 'rounded-bl-sm bg-white text-gray-900 ring-1 ring-gray-100'
        }`}
      >
        {message.messageType === 'image' && message.attachment?.url && (
          <img
            src={message.attachment.url}
            alt="attachment"
            className="mb-1.5 max-h-64 w-full rounded-lg object-cover"
          />
        )}
        {message.messageType === 'pdf' && message.attachment?.url && (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noreferrer"
            className={`mb-1.5 flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium ${
              own ? 'bg-white/15 text-white' : 'bg-gray-50 text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{message.attachment.fileName ?? 'Document.pdf'}</span>
          </a>
        )}
        {message.message && <p className="whitespace-pre-wrap break-words text-sm">{message.message}</p>}

        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${own ? 'text-white/70' : 'text-gray-400'}`}>
          {formatTime(message.createdAt)}
          {own && (read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}
        </div>
      </div>
    </div>
  )
}
