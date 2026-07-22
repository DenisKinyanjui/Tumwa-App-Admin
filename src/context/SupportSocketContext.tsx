import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getToken } from '../services/api'
import { useAuth } from './AuthContext'

// Derive the socket server URL from the API base (strip the trailing /api) —
// same derivation used by BadgeContext's private connection.
const SOCKET_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api').replace(/\/api\/?$/, '')

interface SupportSocketContextValue {
  socket: Socket | null
  connected: boolean
}

const SupportSocketContext = createContext<SupportSocketContextValue>({ socket: null, connected: false })

export function SupportSocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = getToken()
    if (!isAuthenticated || !token) {
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
      return
    }

    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    })
    socketRef.current = s
    setSocket(s)

    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))

    return () => {
      s.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [isAuthenticated])

  return (
    <SupportSocketContext.Provider value={{ socket, connected }}>
      {children}
    </SupportSocketContext.Provider>
  )
}

export const useSupportSocket = (): SupportSocketContextValue => useContext(SupportSocketContext)
