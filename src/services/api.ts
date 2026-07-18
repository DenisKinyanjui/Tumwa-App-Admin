import axios from 'axios'
import { emitSessionExpired } from './sessionEvents'
import type {
  LoginResponse,
  PaginatedResponse,
  AdminUser,
  OverviewData,
  RunnerVerification,
  Payment,
  Errand,
  ErrandAnalytics,
  PaymentAnalytics,
  SystemStatusService,
  AdminDispute,
  ResolutionOutcome,
  AppSettings,
  WorkingCapitalSettings,
} from '../types'

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

// ── Silent refresh-and-retry, with a queue so concurrent 401s only trigger
// one /auth/refresh call. The refresh token itself travels as an httpOnly
// cookie (sent automatically via withCredentials) — nothing to store here.
let isRefreshing = false
let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const resolveQueue = (token: string) => {
  pendingQueue.forEach(({ resolve }) => resolve(token))
  pendingQueue = []
}

const rejectQueue = (err: unknown) => {
  pendingQueue.forEach(({ reject }) => reject(err))
  pendingQueue = []
}

// Normalize error messages from backend { status: 'fail', message: '...' }
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config
    const isAuthenticated = !!originalRequest?.headers?.Authorization
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh')

    if (err.response?.status === 401 && isAuthenticated && !isRefreshCall && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              originalRequest._retry = true
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await api.post('/auth/refresh')
        saveToken(data.accessToken)

        isRefreshing = false
        resolveQueue(data.accessToken)

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return api(originalRequest)
      } catch (refreshErr) {
        isRefreshing = false
        rejectQueue(refreshErr)

        // The refresh cookie itself is invalid/expired — genuine session expiry.
        const msg = err.response?.data?.message ?? 'Your session has expired. Please log in again.'
        emitSessionExpired(msg)
        return Promise.reject(new Error(msg))
      }
    }

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
  const { data } = await api.post<LoginResponse>('/auth/login', { identifier: phone, password })
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

export const fetchErrandAnalytics = async (period = 'month'): Promise<ErrandAnalytics> => {
  const { data } = await api.get<{ status: string; data: ErrandAnalytics }>(
    `/admin/analytics/errands?period=${period}`,
  )
  return data.data
}

export const fetchPaymentAnalytics = async (period = 'year'): Promise<PaymentAnalytics> => {
  const { data } = await api.get<{ status: string; data: PaymentAnalytics }>(
    `/admin/analytics/payments?period=${period}`,
  )
  return data.data
}

export const fetchSystemStatus = async (): Promise<SystemStatusService[]> => {
  const { data } = await api.get<{ status: string; data: { services: SystemStatusService[] } }>(
    '/admin/system-status',
  )
  return data.data.services
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UsersQuery {
  page?: number
  limit?: number
  role?: string
  isActive?: boolean | ''
  search?: string
  sortBy?: 'createdAt' | 'rating' | 'completedErrands' | 'name' | 'workingCapital.limit'
  order?: 'asc' | 'desc'
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
  if (query.sortBy) params.set('sortBy', query.sortBy)
  if (query.order) params.set('order', query.order)

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

export interface UserDetailResponse {
  user: AdminUser
  recentErrands: Array<{ _id: string; title: string; status: string; amount: number; createdAt: string }>
  recentPayments: Array<{ _id: string; type: string; amount: number; status: string; completedAt: string | null }>
  verification: RunnerVerification | null
}

export const fetchUser = async (userId: string): Promise<UserDetailResponse> => {
  const { data } = await api.get<{ status: string; data: UserDetailResponse }>(
    `/admin/users/${userId}`,
  )
  return data.data
}

export const fetchVerification = async (userId: string): Promise<RunnerVerification> => {
  const { data } = await api.get<{ status: string; data: { verification: RunnerVerification } }>(
    `/admin/verifications/${userId}`,
  )
  return data.data.verification
}

export const approveVerification = async (userId: string, notes?: string): Promise<RunnerVerification> => {
  const { data } = await api.patch<{ status: string; data: { verification: RunnerVerification } }>(
    `/admin/verifications/${userId}/approve`,
    { notes },
  )
  return data.data.verification
}

export const rejectVerification = async (userId: string, notes: string): Promise<RunnerVerification> => {
  const { data } = await api.patch<{ status: string; data: { verification: RunnerVerification } }>(
    `/admin/verifications/${userId}/reject`,
    { notes },
  )
  return data.data.verification
}

export const deleteUser = async (userId: string): Promise<void> => {
  await api.delete(`/admin/users/${userId}`)
}

export const updateUser = async (
  userId: string,
  fields: {
    isActive?: boolean
    level?: number
    name?: string
    phone?: string
    role?: string
    rating?: number
    cancelCount?: number
  },
): Promise<AdminUser> => {
  const { data } = await api.patch<{ status: string; data: { user: AdminUser } }>(
    `/admin/users/${userId}`,
    fields,
  )
  return data.data.user
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface PaymentsQuery {
  page?: number
  limit?: number
  type?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

export const fetchPayments = async (
  query: PaymentsQuery = {},
): Promise<PaginatedResponse<{ payments: Payment[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const { data } = await api.get<PaginatedResponse<{ payments: Payment[] }>>(
    `/admin/payments?${params.toString()}`,
  )
  return data
}

// ── Errands ───────────────────────────────────────────────────────────────────

export interface ErrandsQuery {
  page?: number
  limit?: number
  status?: string
  isPaid?: boolean | ''
  dateFrom?: string
  dateTo?: string
}

export const fetchErrands = async (
  query: ErrandsQuery = {},
): Promise<PaginatedResponse<{ errands: Errand[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.status) params.set('status', query.status)
  if (query.isPaid !== '' && query.isPaid !== undefined) params.set('isPaid', String(query.isPaid))
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const { data } = await api.get<PaginatedResponse<{ errands: Errand[] }>>(
    `/admin/errands?${params.toString()}`,
  )
  return data
}

export interface ErrandDetailResponse {
  errand: Errand
  payment: Payment | null
  dispute: { _id: string; status: string; reason: string } | null
}

export const fetchErrand = async (id: string): Promise<ErrandDetailResponse> => {
  const { data } = await api.get<{ status: string; data: ErrandDetailResponse }>(
    `/admin/errands/${id}`,
  )
  return data.data
}

export const cancelErrandAdmin = async (id: string): Promise<Errand> => {
  const { data } = await api.patch<{ status: string; data: { errand: Errand } }>(
    `/errands/${id}/cancel`,
  )
  return data.data.errand
}

export const assignRunnerAdmin = async (id: string, runnerId: string): Promise<Errand> => {
  const { data } = await api.patch<{ status: string; data: { errand: Errand } }>(
    `/errands/${id}/admin-assign`,
    { runnerId },
  )
  return data.data.errand
}

// Marks a runner-initiated cancellation as not the runner's fault, reversing
// the working-capital-limit decrease already applied at cancellation time.
export const excuseCancellationAdmin = async (id: string): Promise<Errand> => {
  const { data } = await api.patch<{ status: string; data: { errand: Errand } }>(
    `/errands/${id}/excuse-cancellation`,
  )
  return data.data.errand
}

// ── Disputes ──────────────────────────────────────────────────────────────────

export const fetchDisputes = async (status?: string): Promise<AdminDispute[]> => {
  const params = status ? `?status=${status}` : ''
  const { data } = await api.get<{ status: string; data: { disputes: AdminDispute[] } }>(
    `/disputes${params}`,
  )
  return data.data.disputes
}

export const fetchDisputeById = async (id: string): Promise<AdminDispute> => {
  const { data } = await api.get<{ status: string; data: { dispute: AdminDispute } }>(
    `/disputes/${id}`,
  )
  return data.data.dispute
}

export const markDisputeUnderReview = async (id: string): Promise<AdminDispute> => {
  const { data } = await api.patch<{ status: string; data: { dispute: AdminDispute } }>(
    `/disputes/${id}/review`,
  )
  return data.data.dispute
}

export interface ResolveDisputePayload {
  outcome: ResolutionOutcome
  notes?: string
  penaltyAmount?: number
  refundAmount?: number
}

export const resolveDisputeAdmin = async (
  id: string,
  payload: ResolveDisputePayload,
): Promise<AdminDispute> => {
  const { data } = await api.patch<{ status: string; data: { dispute: AdminDispute } }>(
    `/disputes/${id}/resolve`,
    payload,
  )
  return data.data.dispute
}

export const rejectDisputeAdmin = async (id: string, notes?: string): Promise<AdminDispute> => {
  const { data } = await api.patch<{ status: string; data: { dispute: AdminDispute } }>(
    `/disputes/${id}/reject`,
    { notes },
  )
  return data.data.dispute
}

// ── Legal content ─────────────────────────────────────────────────────────────

export interface LegalContent {
  content: string
  version: number
  updatedAt: string | null
}

export const fetchTerms = async (): Promise<LegalContent> => {
  const { data } = await api.get<{ status: string; data: LegalContent }>('/admin/legal/terms')
  return data.data
}

export const updateTerms = async (content: string): Promise<LegalContent> => {
  const { data } = await api.put<{ status: string; data: LegalContent }>('/admin/legal/terms', { content })
  return data.data
}

// ── App settings ──────────────────────────────────────────────────────────────

export const fetchSettings = async (): Promise<AppSettings> => {
  const { data } = await api.get<{ status: string; data: AppSettings }>('/admin/settings')
  return data.data
}

export const updateSettings = async (
  workingCapital: Partial<WorkingCapitalSettings>,
): Promise<AppSettings> => {
  const { data } = await api.patch<{ status: string; data: AppSettings }>('/admin/settings', { workingCapital })
  return data.data
}

// Manually overrides a runner's Working Capital Limit (not their `used` value,
// which is auto-tracked from active errands).
export const setRunnerWorkingCapital = async (userId: string, limit: number): Promise<AdminUser> => {
  const { data } = await api.patch<{ status: string; data: { user: AdminUser } }>(
    `/admin/users/${userId}/working-capital`,
    { limit },
  )
  return data.data.user
}

export default api
