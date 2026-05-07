import axios from 'axios'
import type { LoginResponse, PaginatedResponse, AdminUser, OverviewData } from '../types'

const TOKEN_KEY = 'tumwa_admin_token'

// ── Axios instance ────────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
  withCredentials: true, // send httpOnly refresh cookie when needed
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Normalize error messages from backend { status: 'fail', message: '...' }
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.message ??
      'An unexpected error occurred'
    return Promise.reject(new Error(msg))
  },
)

// ── Token helpers ─────────────────────────────────────────────────────────────

export const saveToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const removeToken = () => localStorage.removeItem(TOKEN_KEY)
export const getToken = () => localStorage.getItem(TOKEN_KEY)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authLogin = async (phone: string, password: string): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login', { phone, password })
  return data
}

export const authLogout = async (): Promise<void> => {
  await api.post('/auth/logout').catch(() => {}) // best-effort
}

export const authMe = async () => {
  const { data } = await api.get<{ status: string; data: { user: LoginResponse['data']['user'] } }>('/auth/me')
  return data.data.user
}

// ── Analytics ────────────────────────────────────────────────────────────────

export const fetchOverview = async (period = 'month'): Promise<OverviewData> => {
  const { data } = await api.get<{ status: string; data: OverviewData }>(
    `/admin/analytics/overview?period=${period}`,
  )
  return data.data
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UsersQuery {
  page?: number
  limit?: number
  role?: string
  isActive?: boolean | ''
  search?: string
}

export const fetchUsers = async (
  query: UsersQuery = {},
): Promise<PaginatedResponse<{ users: AdminUser[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.role) params.set('role', query.role)
  if (query.isActive !== '' && query.isActive !== undefined)
    params.set('isActive', String(query.isActive))
  if (query.search) params.set('search', query.search)

  const { data } = await api.get<PaginatedResponse<{ users: AdminUser[] }>>(
    `/admin/users?${params.toString()}`,
  )
  return data
}

export const updateUserStatus = async (
  userId: string,
  isActive: boolean,
): Promise<AdminUser> => {
  const { data } = await api.patch<{ status: string; data: { user: AdminUser } }>(
    `/admin/users/${userId}`,
    { isActive },
  )
  return data.data.user
}

export default api
