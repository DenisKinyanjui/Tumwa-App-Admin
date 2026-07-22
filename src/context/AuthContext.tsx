import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import {
  authLogin,
  authLogout,
  authMe,
  saveToken,
  removeToken,
  getToken,
} from '../services/api'
import type { AuthUser } from '../types'

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (phone: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // On mount, validate the stored token by calling /auth/me
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setIsLoading(false)
      return
    }
    authMe()
      .then((me) => {
        if (!['admin', 'superadmin'].includes(me.role)) {
          removeToken()
          setUser(null)
        } else {
          setUser(me)
        }
      })
      .catch(() => {
        removeToken()
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (phone: string, password: string) => {
    const res = await authLogin(phone, password)
    if (!['admin', 'superadmin'].includes(res.data.user.role)) {
      throw new Error('Access denied. Admin accounts only.')
    }
    saveToken(res.accessToken)
    setUser(res.data.user)
  }, [])

  const logout = useCallback(async () => {
    await authLogout()
    removeToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
