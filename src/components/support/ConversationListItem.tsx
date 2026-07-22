import Avatar from '../Avatar'
import { RoleBadge, timeAgo } from './supportMeta'
import type { SupportConversation } from '../../types'

interface ConversationListItemProps {
  conversation: SupportConversation
  active: boolean
  online: boolean
  onClick: () => void
}

export default function ConversationListItem({ conversation, active, online, onClick }: ConversationListItemProps) {
  const requester = conversation.requester
  const unread = conversation.unreadCounts.admin

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-start gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors ${
        active ? 'bg-primary-50' : 'hover:bg-gray-50'
      }`}
    >
      <Avatar name={requester?.name ?? '?'} photoUrl={requester?.photoUrl} online={online} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{requester?.name ?? 'Unknown user'}</p>
          <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(conversation.lastActivity)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {requester && <RoleBadge role={requester.role} />}
        </div>
        <p className="mt-1 truncate text-xs text-gray-500">{conversation.lastMessage ?? 'No messages yet'}</p>
      </div>
      {unread > 0 && (
        <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
          {unread}
        </span>
      )}
    </button>
  )
}
