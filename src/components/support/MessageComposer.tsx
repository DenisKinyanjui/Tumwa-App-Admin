import { useRef, useState } from 'react'
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react'
import { Send, Smile, Image as ImageIcon, Paperclip, Loader2 } from 'lucide-react'

interface MessageComposerProps {
  disabled?: boolean
  onSend: (text: string) => Promise<void>
  onSendFile: (file: File) => Promise<void>
  onTyping: () => void
  onStopTyping: () => void
}

export default function MessageComposer({ disabled, onSend, onSendFile, onTyping, onStopTyping }: MessageComposerProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (value: string) => {
    setText(value)
    onTyping()
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(onStopTyping, 2000)
  }

  const handleSend = async () => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
      onStopTyping()
    } finally {
      setSending(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setSending(true)
    try {
      await onSendFile(file)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative border-t border-gray-100 bg-white p-3">
      {showEmoji && (
        <div className="absolute bottom-full left-3 z-20 mb-2">
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) => handleChange(text + data.emoji)}
            width={320}
            height={360}
          />
        </div>
      )}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setShowEmoji((v) => !v)}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          disabled={disabled}
        >
          <Smile className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          disabled={disabled || sending}
        >
          <ImageIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          disabled={disabled || sending}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFile} />

        <textarea
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          onFocus={() => setShowEmoji(false)}
          placeholder="Write a reply..."
          rows={1}
          disabled={disabled}
          className="max-h-32 flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || sending || !text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
