import { useEffect, useState } from 'react'
import { Archive, Trash2, ChevronDown } from 'lucide-react'
import Avatar from '../Avatar'
import { RoleBadge, StatusBadge, PriorityBadge, CATEGORY_LABELS } from './supportMeta'
import { fetchUsers } from '../../services/api'
import type {
  SupportConversation,
  SupportRequester,
  SupportStatus,
  SupportPriority,
  SupportCategory,
} from '../../types'

interface ConversationHeaderProps {
  conversation: SupportConversation
  requester: SupportRequester | null | undefined
  assignedAdminName: string | null
  online: boolean
  canDelete: boolean
  onStatusChange: (status: SupportStatus) => void
  onPriorityChange: (priority: SupportPriority) => void
  onCategoryChange: (category: SupportCategory) => void
  onAssign: (adminId: string) => void
  onArchive: () => void
  onDelete: () => void
}

const STATUS_OPTIONS: SupportStatus[] = ['open', 'waiting_admin', 'waiting_user', 'resolved', 'closed']
const PRIORITY_OPTIONS: SupportPriority[] = ['low', 'medium', 'high', 'critical']
const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABELS) as SupportCategory[]

const selectCls =
  'appearance-none rounded-lg border border-gray-200 bg-white py-1.5 pl-2.5 pr-7 text-xs font-medium text-gray-600 outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100'

export default function ConversationHeader({
  conversation,
  requester,
  assignedAdminName,
  online,
  canDelete,
  onStatusChange,
  onPriorityChange,
  onCategoryChange,
  onAssign,
  onArchive,
  onDelete,
}: ConversationHeaderProps) {
  const [admins, setAdmins] = useState<Array<{ _id: string; name: string }>>([])

  useEffect(() => {
    Promise.all([fetchUsers({ role: 'admin', limit: 100 }), fetchUsers({ role: 'superadmin', limit: 100 })])
      .then(([a, b]) => setAdmins([...a.data.users, ...b.data.users]))
      .catch(() => setAdmins([]))
  }, [])

  return (
    <div className="border-b border-gray-100 bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={requester?.name ?? '?'} photoUrl={requester?.photoUrl} online={online} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-gray-900">{requester?.name ?? 'Unknown user'}</p>
              {requester && <RoleBadge role={requester.role} />}
            </div>
            <p className="text-xs text-gray-400">
              {online ? 'Online' : 'Offline'} · {assignedAdminName ? `Assigned to ${assignedAdminName}` : 'Unassigned'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onArchive}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            title="Archive conversation"
          >
            <Archive className="h-4 w-4" />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              title="Delete conversation (superadmin)"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge status={conversation.status} />
        <PriorityBadge priority={conversation.priority} />

        <div className="relative">
          <select
            value={conversation.status}
            onChange={(e) => onStatusChange(e.target.value as SupportStatus)}
            className={selectCls}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={conversation.priority}
            onChange={(e) => onPriorityChange(e.target.value as SupportPriority)}
            className={selectCls}
          >
            {PRIORITY_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={conversation.category}
            onChange={(e) => onCategoryChange(e.target.value as SupportCategory)}
            className={selectCls}
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="relative">
          <select
            value={conversation.assignedAdmin ?? ''}
            onChange={(e) => e.target.value && onAssign(e.target.value)}
            className={selectCls}
          >
            <option value="" disabled>
              Assign to...
            </option>
            {admins.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
    </div>
  )
}
