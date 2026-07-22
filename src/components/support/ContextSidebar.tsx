import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  User as UserIcon,
  Phone,
  CalendarDays,
  ShieldCheck,
  Wallet,
  Briefcase,
  Receipt,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Ban,
} from 'lucide-react'
import Avatar from '../Avatar'
import InternalNotes from './InternalNotes'
import { fetchUser, fetchDisputes, updateUserStatus, fetchSupportNotes, addSupportNote } from '../../services/api'
import type { SupportRequester, SupportInternalNote, AdminUser, AdminDispute } from '../../types'

interface ContextSidebarProps {
  conversationId: string
  requester: SupportRequester | null | undefined
}

const money = (n: number) => `KES ${n.toLocaleString()}`

export default function ContextSidebar({ conversationId, requester }: ContextSidebarProps) {
  const navigate = useNavigate()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [recentErrands, setRecentErrands] = useState<Array<{ _id: string; title: string; status: string; amount: number }>>([])
  const [recentPayments, setRecentPayments] = useState<Array<{ _id: string; type: string; amount: number; status: string }>>([])
  const [activeDisputes, setActiveDisputes] = useState<AdminDispute[]>([])
  const [notes, setNotes] = useState<SupportInternalNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!requester) return
    setLoading(true)
    Promise.all([
      fetchUser(requester.id),
      fetchDisputes('pending'),
      fetchDisputes('under_review'),
      fetchSupportNotes(conversationId),
    ])
      .then(([detail, pending, underReview, noteList]) => {
        setUser(detail.user)
        setRecentErrands(detail.recentErrands)
        setRecentPayments(detail.recentPayments)
        setActiveDisputes(
          [...pending, ...underReview].filter(
            (d) => d.customer._id === requester.id || d.runner._id === requester.id,
          ),
        )
        setNotes(noteList)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [requester?.id, conversationId])

  if (!requester) {
    return <div className="w-[320px] shrink-0 border-l border-gray-200 bg-white" />
  }

  const activeErrand = recentErrands.find((e) => ['assigned', 'in_progress'].includes(e.status))

  const handleSuspend = async () => {
    if (!user) return
    if (!confirm(`${user.isActive ? 'Suspend' : 'Reactivate'} ${user.name}?`)) return
    const updated = await updateUserStatus(user._id, !user.isActive)
    setUser(updated)
  }

  return (
    <div className="w-[320px] shrink-0 space-y-5 overflow-y-auto border-l border-gray-200 bg-white p-4">
      {/* User info */}
      <div>
        <div className="flex flex-col items-center text-center">
          <Avatar name={requester.name} photoUrl={requester.photoUrl} size="lg" />
          <p className="mt-2 text-sm font-semibold text-gray-900">{requester.name}</p>
          <p className="text-xs capitalize text-gray-400">{requester.role}</p>
        </div>

        <div className="mt-3 space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 text-gray-400" /> {requester.phone}
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-gray-400" />
            <span className="capitalize">{requester.verificationStatus}</span>
          </div>
          <div className="flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5 text-gray-400" />
            {requester.isActive ? 'Active account' : 'Suspended'}
          </div>
          {user && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </div>
          )}
          {user?.availability?.latitude && (
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {user.availability.latitude.toFixed(4)}, {user.availability.longitude?.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      {/* Quick info */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Information</p>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Briefcase className="h-3.5 w-3.5" /> Active errand
              </span>
              <span className="font-medium text-gray-800">{activeErrand ? activeErrand.title : 'None'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2">
              <span className="flex items-center gap-1.5 text-gray-500">
                <Wallet className="h-3.5 w-3.5" /> Wallet balance
              </span>
              <span className="font-medium text-gray-800">
                {money((user?.wallet.earnings ?? 0) + (user?.customerWallet?.balance ?? 0))}
              </span>
            </div>
            {requester.role === 'runner' && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2">
                <span className="text-gray-500">Working capital</span>
                <span className="font-medium text-gray-800">
                  {money(user?.workingCapital?.used ?? 0)} / {money(user?.workingCapital?.limit ?? 0)}
                </span>
              </div>
            )}
            <div className="rounded-lg bg-gray-50 px-2.5 py-2">
              <span className="mb-1 flex items-center gap-1.5 text-gray-500">
                <Receipt className="h-3.5 w-3.5" /> Recent transactions
              </span>
              {recentPayments.length === 0 ? (
                <p className="text-gray-400">None</p>
              ) : (
                recentPayments.slice(0, 3).map((p) => (
                  <div key={p._id} className="flex justify-between py-0.5 text-gray-700">
                    <span className="capitalize">{p.type.replace('_', ' ')}</span>
                    <span>{money(p.amount)}</span>
                  </div>
                ))
              )}
            </div>
            {activeDisputes.length > 0 && (
              <div className="rounded-lg bg-red-50 px-2.5 py-2 text-red-700">
                <span className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> {activeDisputes.length} active dispute(s)
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Quick Actions</p>
        <div className="space-y-1.5">
          <button
            onClick={() => navigate(`/users/${requester.id}`)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            View Profile <ExternalLink className="h-3.5 w-3.5" />
          </button>
          {activeErrand && (
            <button
              onClick={() => navigate(`/errands/${activeErrand._id}`)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Open Errand <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={() => navigate('/payments')}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Open Transactions <ExternalLink className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => navigate(`/users/${requester.id}`)}
            className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Open Wallet <ExternalLink className="h-3.5 w-3.5" />
          </button>
          {activeDisputes.length > 0 && (
            <button
              onClick={() => navigate('/disputes')}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-2.5 py-2 text-xs font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Open Dispute <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={handleSuspend}
            className="flex w-full items-center justify-between rounded-lg border border-red-100 px-2.5 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
          >
            {user?.isActive ? 'Suspend User' : 'Reactivate User'} <Ban className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <InternalNotes
        notes={notes}
        onAdd={async (note) => {
          const created = await addSupportNote(conversationId, note)
          setNotes((prev) => [created, ...prev])
        }}
      />
    </div>
  )
}
