import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSupportSocket } from '../context/SupportSocketContext'
import { useBadges } from '../context/BadgeContext'
import type { LayoutOutletContext } from '../layouts/AdminLayout'
import ConversationSidebar, { type SupportTab } from '../components/support/ConversationSidebar'
import ConversationHeader from '../components/support/ConversationHeader'
import MessageThread from '../components/support/MessageThread'
import MessageComposer from '../components/support/MessageComposer'
import ContextSidebar from '../components/support/ContextSidebar'
import SupportDashboardCards from '../components/support/SupportDashboardCards'
import {
  fetchSupportConversations,
  fetchSupportConversation,
  fetchSupportMessages,
  sendSupportMessage,
  uploadSupportAttachment,
  updateSupportConversation,
  assignSupportConversation,
  updateSupportStatus,
  archiveSupportConversation,
  deleteSupportConversation,
  markSupportRead,
  fetchSupportDashboard,
} from '../services/api'
import type {
  SupportConversation,
  SupportMessage,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SupportDashboardData,
} from '../types'

export default function Support() {
  const { setSubtitle } = useOutletContext<LayoutOutletContext>()
  const { user } = useAuth()
  const { socket } = useSupportSocket()
  const { resetSupportUnread } = useBadges()

  const canViewArchived = user?.role === 'superadmin'
  const canDelete = user?.role === 'superadmin'

  const [tab, setTab] = useState<SupportTab>('all')
  const [conversations, setConversations] = useState<SupportConversation[]>([])
  const [listLoading, setListLoading] = useState(true)

  const [active, setActive] = useState<SupportConversation | null>(null)
  const [requester, setActiveRequester] = useState<SupportConversation['requester']>(null)
  const [assignedAdminName, setAssignedAdminName] = useState<string | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [typing, setTyping] = useState(false)

  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())
  const [dashboard, setDashboard] = useState<SupportDashboardData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  const activeIdRef = useRef<string | null>(null)

  useEffect(() => { setSubtitle('Real-time conversations with customers and runners') }, [setSubtitle])

  const loadConversations = useCallback(() => {
    setListLoading(true)
    const filters =
      tab === 'all'
        ? {}
        : tab === 'archived'
          ? { archived: true }
          : { channel: tab }
    fetchSupportConversations(filters)
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setListLoading(false))
  }, [tab])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    setDashboardLoading(true)
    fetchSupportDashboard()
      .then(setDashboard)
      .catch(() => {})
      .finally(() => setDashboardLoading(false))
  }, [])

  useEffect(() => { resetSupportUnread() }, [resetSupportUnread])

  const selectConversation = useCallback(
    (conversation: SupportConversation) => {
      if (activeIdRef.current && socket) {
        socket.emit('support:leave', { conversationId: activeIdRef.current })
      }
      activeIdRef.current = conversation._id
      setActive(conversation)
      setActiveRequester(conversation.requester ?? null)
      setAssignedAdminName(null)
      setMessages([])
      setTyping(false)
      setMessagesLoading(true)

      if (socket) socket.emit('support:join', { conversationId: conversation._id })

      fetchSupportConversation(conversation._id)
        .then(({ conversation: full, requester: req, assignedAdmin }) => {
          setActive(full)
          setActiveRequester(req)
          setAssignedAdminName(assignedAdmin?.name ?? null)
        })
        .catch(() => {})

      fetchSupportMessages(conversation._id)
        .then(setMessages)
        .catch(() => setMessages([]))
        .finally(() => setMessagesLoading(false))

      markSupportRead(conversation._id).catch(() => {})
      setConversations((prev) =>
        prev.map((c) => (c._id === conversation._id ? { ...c, unreadCounts: { ...c.unreadCounts, admin: 0 } } : c)),
      )
    },
    [socket],
  )

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return

    const onNewConversation = () => loadConversations()

    const onConversationUpdated = ({ conversation }: { conversation: SupportConversation }) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c._id === conversation._id)
        const next = exists
          ? prev.map((c) => (c._id === conversation._id ? { ...c, ...conversation, requester: c.requester } : c))
          : [conversation, ...prev]
        return next.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      })
      if (activeIdRef.current === conversation._id) {
        setActive((prev) => (prev ? { ...prev, ...conversation, requester: prev.requester } : prev))
      }
    }

    const onNewMessage = ({ conversationId, message }: { conversationId: string; message: SupportMessage }) => {
      if (activeIdRef.current === conversationId) {
        setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]))
        if (message.senderId !== user?.id) markSupportRead(conversationId).catch(() => {})
      }
    }

    const onTyping = ({ conversationId }: { conversationId: string }) => {
      if (activeIdRef.current === conversationId) setTyping(true)
    }
    const onStopTyping = ({ conversationId }: { conversationId: string }) => {
      if (activeIdRef.current === conversationId) setTyping(false)
    }

    const onPresence = ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev)
        if (online) next.add(userId)
        else next.delete(userId)
        return next
      })
    }

    socket.on('support:new-conversation', onNewConversation)
    socket.on('support:conversation-updated', onConversationUpdated)
    socket.on('support:new-message', onNewMessage)
    socket.on('support:user-typing', onTyping)
    socket.on('support:user-stop-typing', onStopTyping)
    socket.on('support:presence', onPresence)

    return () => {
      socket.off('support:new-conversation', onNewConversation)
      socket.off('support:conversation-updated', onConversationUpdated)
      socket.off('support:new-message', onNewMessage)
      socket.off('support:user-typing', onTyping)
      socket.off('support:user-stop-typing', onStopTyping)
      socket.off('support:presence', onPresence)
    }
  }, [socket, loadConversations, user?.id])

  // ── Composer handlers ─────────────────────────────────────────────────────
  const handleSend = async (text: string) => {
    if (!active) return
    const message = await sendSupportMessage(active._id, text)
    setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]))
  }

  const handleSendFile = async (file: File) => {
    if (!active) return
    const message = await uploadSupportAttachment(active._id, file)
    setMessages((prev) => (prev.some((m) => m._id === message._id) ? prev : [...prev, message]))
  }

  const handleTyping = () => {
    if (!active || !socket) return
    socket.emit('support:typing', { conversationId: active._id })
  }
  const handleStopTyping = () => {
    if (!active || !socket) return
    socket.emit('support:stop-typing', { conversationId: active._id })
  }

  // ── Header action handlers ────────────────────────────────────────────────
  const applyLocalUpdate = (updated: SupportConversation) => {
    setActive((prev) => (prev ? { ...prev, ...updated, requester: prev.requester } : prev))
    setConversations((prev) => prev.map((c) => (c._id === updated._id ? { ...c, ...updated, requester: c.requester } : c)))
  }

  const handleStatusChange = async (status: SupportStatus) => {
    if (!active) return
    applyLocalUpdate(await updateSupportStatus(active._id, status))
  }
  const handlePriorityChange = async (priority: SupportPriority) => {
    if (!active) return
    applyLocalUpdate(await updateSupportConversation(active._id, { priority }))
  }
  const handleCategoryChange = async (category: SupportCategory) => {
    if (!active) return
    applyLocalUpdate(await updateSupportConversation(active._id, { category }))
  }
  const handleAssign = async (adminId: string) => {
    if (!active) return
    applyLocalUpdate(await assignSupportConversation(active._id, adminId))
  }
  const handleArchive = async () => {
    if (!active) return
    if (!confirm('Archive this conversation?')) return
    await archiveSupportConversation(active._id)
    setConversations((prev) => prev.filter((c) => c._id !== active._id))
    setActive(null)
  }
  const handleDelete = async () => {
    if (!active) return
    if (!confirm('Permanently delete this conversation? This cannot be undone.')) return
    await deleteSupportConversation(active._id)
    setConversations((prev) => prev.filter((c) => c._id !== active._id))
    setActive(null)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col overflow-hidden">
      <SupportDashboardCards data={dashboard} loading={dashboardLoading} />

      <div className="flex flex-1 overflow-hidden">
        <ConversationSidebar
          conversations={conversations}
          loading={listLoading}
          activeId={active?._id ?? null}
          onlineUserIds={onlineUserIds}
          onSelect={selectConversation}
          tab={tab}
          onTabChange={setTab}
          canViewArchived={canViewArchived}
        />

        {active ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            <ConversationHeader
              conversation={active}
              requester={requester}
              assignedAdminName={assignedAdminName}
              online={requester ? onlineUserIds.has(requester.id) : false}
              canDelete={canDelete}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onCategoryChange={handleCategoryChange}
              onAssign={handleAssign}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
            <MessageThread
              messages={messages}
              currentUserId={user?.id ?? ''}
              requesterId={active.requesterId}
              typing={typing}
              loading={messagesLoading}
            />
            <MessageComposer
              disabled={active.status === 'closed'}
              onSend={handleSend}
              onSendFile={handleSendFile}
              onTyping={handleTyping}
              onStopTyping={handleStopTyping}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center text-gray-400">
            <p className="text-sm font-medium">Select a conversation</p>
            <p className="text-xs">Pick a conversation from the list to start replying.</p>
          </div>
        )}

        {active && <ContextSidebar conversationId={active._id} requester={requester} />}
      </div>
    </div>
  )
}
