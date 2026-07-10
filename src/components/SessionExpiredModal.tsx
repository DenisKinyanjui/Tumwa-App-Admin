import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { onSessionExpired } from '../services/sessionEvents'

const DEFAULT_MESSAGE = 'Your session has expired. Please log in again.'

export default function SessionExpiredModal() {
  const { isAuthenticated, logout } = useAuth()
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState(DEFAULT_MESSAGE)

  useEffect(() => {
    return onSessionExpired((msg) => {
      // Ignore stale 401s that arrive after the admin is already logged out.
      if (!isAuthenticated || visible) return
      setMessage(msg || DEFAULT_MESSAGE)
      setVisible(true)
    })
  }, [isAuthenticated, visible])

  const handleOk = async () => {
    setVisible(false)
    await logout()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-gray-100">
        <h3 className="text-base font-bold text-gray-900">Session Expired</h3>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <button
          onClick={handleOk}
          className="mt-5 w-full rounded-xl bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          OK
        </button>
      </div>
    </div>
  )
}
