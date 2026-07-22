import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { fetchOverview, fetchSupportDashboard, getToken } from '../services/api'
import type { OverviewData } from '../types'

// Derive the socket server URL from the API base (strip the trailing /api)
const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
).replace(/\/api\/?$/, '')

// The default period fetchOverview() below resolves to — exported so
// Dashboard.tsx can tell whether its own requested period matches what's
// already sitting here, and skip a redundant duplicate fetch if so.
export const BADGE_OVERVIEW_PERIOD = 'month'

interface BadgeContextValue {
  openDisputes: number
  pendingVerifications: number
  // Conversations waiting on an admin reply — sourced from GET /support/dashboard
  // and live-incremented on support:new-conversation/support:new-message.
  supportUnread: number
  // Full overview payload from the same fetch that derives the counts above
  // (period = BADGE_OVERVIEW_PERIOD) — reused by Dashboard.tsx to avoid
  // firing a second, identical request to the same endpoint on every load.
  overview: OverviewData | null
  // True once the fetch above has settled unsuccessfully (e.g. this mounted
  // before login and got a 401) — lets a consumer waiting on `overview` know
  // to fall back to its own fetch instead of waiting on a value that will
  // never arrive.
  overviewFailed: boolean
  decrementOpenDisputes: () => void
  decrementPendingVerifications: () => void
  resetSupportUnread: () => void
}

const BadgeContext = createContext<BadgeContextValue | null>(null)

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [openDisputes, setOpenDisputes]           = useState(0)
  const [pendingVerifications, setPendingVers]    = useState(0)
  const [supportUnread, setSupportUnread]         = useState(0)
  const [overview, setOverview]                   = useState<OverviewData | null>(null)
  const [overviewFailed, setOverviewFailed]       = useState(false)
  const socketRef                                  = useRef<Socket | null>(null)

  // Initial counts from the overview API
  useEffect(() => {
    fetchOverview(BADGE_OVERVIEW_PERIOD)
      .then((data) => {
        const byStatus = data.disputes.byStatus
        setOpenDisputes((byStatus.pending ?? 0) + (byStatus.under_review ?? 0))
        setPendingVers(data.users.runners.verification.pending)
        setOverview(data)
      })
      .catch(() => setOverviewFailed(true))
  }, [])

  // Initial support-inbox count (conversations waiting on an admin reply)
  useEffect(() => {
    fetchSupportDashboard()
      .then((data) => setSupportUnread(data.summary.waitingAdmin))
      .catch(() => {
        // Non-admin (e.g. this fetch races a not-yet-authenticated mount) — ignore
      })
  }, [])

  // Live socket connection — reconnects automatically if token is present
  useEffect(() => {
    const token = getToken()
    if (!token) return

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    })
    socketRef.current = socket

    // New dispute submitted by a user
    socket.on('dispute-raised', () => {
      setOpenDisputes((c) => c + 1)
    })

    // Runner first-time verification submission
    socket.on('verification-submitted', () => {
      setPendingVers((c) => c + 1)
    })

    // Runner re-submission after rejection
    socket.on('verification-resubmitted', () => {
      setPendingVers((c) => c + 1)
    })

    // New support conversation, or a new message on an existing one —
    // both mean "something is waiting on an admin".
    socket.on('support:new-conversation', () => {
      setSupportUnread((c) => c + 1)
    })
    socket.on('support:new-message', () => {
      setSupportUnread((c) => c + 1)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // connect once; token won't change without a full re-login

  const decrementOpenDisputes      = () => setOpenDisputes((c) => Math.max(0, c - 1))
  const decrementPendingVerifications = () => setPendingVers((c) => Math.max(0, c - 1))
  // useCallback so a stable reference is safe to depend on inside a
  // consumer's useEffect (Support.tsx clears the badge on mount).
  const resetSupportUnread = useCallback(() => setSupportUnread(0), [])

  return (
    <BadgeContext.Provider
      value={{
        openDisputes,
        pendingVerifications,
        supportUnread,
        overview,
        overviewFailed,
        decrementOpenDisputes,
        decrementPendingVerifications,
        resetSupportUnread,
      }}
    >
      {children}
    </BadgeContext.Provider>
  )
}

export function useBadges(): BadgeContextValue {
  const ctx = useContext(BadgeContext)
  if (!ctx) throw new Error('useBadges must be used inside <BadgeProvider>')
  return ctx
}
