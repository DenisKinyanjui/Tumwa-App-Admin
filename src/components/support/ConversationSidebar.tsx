import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import ConversationListItem from './ConversationListItem'
import type { SupportConversation, SupportChannel } from '../../types'

type Tab = 'all' | SupportChannel | 'archived'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'live_chat', label: 'Live Chat' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'call', label: 'Calls' },
  { key: 'archived', label: 'Archived' },
]

interface ConversationSidebarProps {
  conversations: SupportConversation[]
  loading: boolean
  activeId: string | null
  onlineUserIds: Set<string>
  onSelect: (conversation: SupportConversation) => void
  tab: Tab
  onTabChange: (tab: Tab) => void
  canViewArchived: boolean
}

export default function ConversationSidebar({
  conversations,
  loading,
  activeId,
  onlineUserIds,
  onSelect,
  tab,
  onTabChange,
  canViewArchived,
}: ConversationSidebarProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.trim().toLowerCase()
    return conversations.filter(
      (c) => c.requester?.name.toLowerCase().includes(q) || c.lastMessage?.toLowerCase().includes(q),
    )
  }, [conversations, search])

  const visibleTabs = canViewArchived ? TABS : TABS.filter((t) => t.key !== 'archived')

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 py-2">
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key ? 'bg-primary-500 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-1 py-2">
                <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-500">No conversations</p>
            <p className="text-xs text-gray-400">Nothing matches this filter yet.</p>
          </div>
        ) : (
          filtered.map((c) => (
            <ConversationListItem
              key={c._id}
              conversation={c}
              active={c._id === activeId}
              online={c.requester ? onlineUserIds.has(c.requester.id) : false}
              onClick={() => onSelect(c)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export type { Tab as SupportTab }
