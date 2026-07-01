import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { io, type Socket } from 'socket.io-client'
import { fetchOverview, getToken } from '../services/api'

// Derive the socket server URL from the API base (strip the trailing /api)
const SOCKET_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api'
).replace(/\/api\/?$/, '')

interface BadgeContextValue {
  openDisputes: number
  pendingVerifications: number
  decrementOpenDisputes: () => void
  decrementPendingVerifications: () => void
}

const BadgeContext = createContext<BadgeContextValue | null>(null)

export function BadgeProvider({ children }: { children: ReactNode }) {
  const [openDisputes, setOpenDisputes]           = useState(0)
  const [pendingVerifications, setPendingVers]    = useState(0)
  const socketRef                                  = useRef<Socket | null>(null)

  // Initial counts from the overview API
  useEffect(() => {
    fetchOverview()
      .then((data) => {
        const byStatus = data.disputes.byStatus
        setOpenDisputes((byStatus.pending ?? 0) + (byStatus.under_review ?? 0))
        setPendingVers(data.users.runners.verification.pending)
      })
      .catch(() => {})
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

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // connect once; token won't change without a full re-login

  const decrementOpenDisputes      = () => setOpenDisputes((c) => Math.max(0, c - 1))
  const decrementPendingVerifications = () => setPendingVers((c) => Math.max(0, c - 1))

  return (
    <BadgeContext.Provider
      value={{ openDisputes, pendingVerifications, decrementOpenDisputes, decrementPendingVerifications }}
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
