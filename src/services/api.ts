import axios from 'axios'
import { emitSessionExpired } from './sessionEvents'
import type {
  LoginResponse,
  PaginatedResponse,
  AdminUser,
  OverviewData,
  RunnerVerification,
  VerificationQueueItem,
  VerificationStatus,
  Payment,
  Errand,
  ErrandAnalytics,
  PaymentAnalytics,
  SystemStatusService,
  AdminDispute,
  ResolutionOutcome,
  AppSettings,
  WorkingCapitalSettings,
  ServiceArea,
  ZoneStatus,
  NotificationCampaign,
  NotificationCampaignStats,
  NotificationAudience,
  NotificationCampaignType,
  NotificationCampaignStatus,
  SystemNotificationEvent,
  Announcement,
  AnnouncementAnalytics,
  AnnouncementType,
  AnnouncementAudience,
  AnnouncementTrigger,
  AnnouncementButtonAction,
  AnnouncementPriority,
  AnnouncementDisplayFrequency,
  AnnouncementStatus,
  SupportConversation,
  SupportMessage,
  SupportInternalNote,
  SupportDashboardData,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  RunnerAnalytics,
  CustomerAnalytics,
  DisputeAnalytics,
  LocationAnalytics,
  VerificationAnalytics,
  GeneratedReport,
  ReportType,
  ReportFormat,
  ReportFilters,
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

export const fetchErrandAnalytics = async (
  period = 'month',
  locationField?: 'pickup' | 'delivery',
): Promise<ErrandAnalytics> => {
  const params = new URLSearchParams({ period })
  if (locationField) params.set('locationField', locationField)
  const { data } = await api.get<{ status: string; data: ErrandAnalytics }>(
    `/admin/analytics/errands?${params.toString()}`,
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

export const fetchRunnerAnalytics = async (period = 'month', runner?: string): Promise<RunnerAnalytics> => {
  const params = new URLSearchParams({ period })
  if (runner) params.set('runner', runner)
  const { data } = await api.get<{ status: string; data: RunnerAnalytics }>(
    `/admin/analytics/runners?${params.toString()}`,
  )
  return data.data
}

export const fetchCustomerAnalytics = async (period = 'month'): Promise<CustomerAnalytics> => {
  const { data } = await api.get<{ status: string; data: CustomerAnalytics }>(
    `/admin/analytics/customers?period=${period}`,
  )
  return data.data
}

export const fetchDisputeAnalytics = async (period = 'month'): Promise<DisputeAnalytics> => {
  const { data } = await api.get<{ status: string; data: DisputeAnalytics }>(
    `/admin/analytics/disputes?period=${period}`,
  )
  return data.data
}

export const fetchLocationAnalytics = async (period = 'month'): Promise<LocationAnalytics> => {
  const { data } = await api.get<{ status: string; data: LocationAnalytics }>(
    `/admin/analytics/locations?period=${period}`,
  )
  return data.data
}

export const fetchVerificationAnalytics = async (period = 'month'): Promise<VerificationAnalytics> => {
  const { data } = await api.get<{ status: string; data: VerificationAnalytics }>(
    `/admin/analytics/verifications?period=${period}`,
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

export const fetchVerificationsQueue = async (
  query: { status?: VerificationStatus; page?: number; limit?: number } = {},
): Promise<PaginatedResponse<{ verifications: VerificationQueueItem[] }>> => {
  const params = new URLSearchParams()
  if (query.status) params.set('status', query.status)
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  const { data } = await api.get<PaginatedResponse<{ verifications: VerificationQueueItem[] }>>(
    `/admin/verifications?${params.toString()}`,
  )
  return data
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

export const requestResubmissionVerification = async (userId: string, reason: string): Promise<RunnerVerification> => {
  const { data } = await api.patch<{ status: string; data: { verification: RunnerVerification } }>(
    `/admin/verifications/${userId}/request-resubmission`,
    { reason },
  )
  return data.data.verification
}

export const reopenVerification = async (userId: string, reason?: string): Promise<RunnerVerification> => {
  const { data } = await api.patch<{ status: string; data: { verification: RunnerVerification } }>(
    `/admin/verifications/${userId}/reopen`,
    { reason },
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

// ── Service areas ────────────────────────────────────────────────────────────

export const fetchServiceAreas = async (): Promise<ServiceArea[]> => {
  const { data } = await api.get<{ status: string; data: { areas: ServiceArea[] } }>('/admin/locations')
  return data.data.areas
}

export const createServiceArea = async (payload: { name: string; region?: string }): Promise<ServiceArea> => {
  const { data } = await api.post<{ status: string; data: { area: ServiceArea } }>('/admin/locations', payload)
  return data.data.area
}

export const updateServiceArea = async (
  id: string,
  patch: { name?: string; region?: string; status?: ZoneStatus; sortOrder?: number },
): Promise<ServiceArea> => {
  const { data } = await api.patch<{ status: string; data: { area: ServiceArea } }>(`/admin/locations/${id}`, patch)
  return data.data.area
}

export const deleteServiceArea = async (id: string): Promise<void> => {
  await api.delete(`/admin/locations/${id}`)
}

// ── Notification campaigns ──────────────────────────────────────────────────

export interface NotificationCampaignsQuery {
  page?: number
  limit?: number
  search?: string
  audience?: NotificationAudience | ''
  status?: NotificationCampaignStatus | ''
  dateFrom?: string
  dateTo?: string
}

export const fetchNotificationCampaigns = async (
  query: NotificationCampaignsQuery = {},
): Promise<PaginatedResponse<{ campaigns: NotificationCampaign[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.audience) params.set('audience', query.audience)
  if (query.status) params.set('status', query.status)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const { data } = await api.get<PaginatedResponse<{ campaigns: NotificationCampaign[] }>>(
    `/admin/notification-campaigns?${params.toString()}`,
  )
  return data
}

export const fetchNotificationStats = async (): Promise<NotificationCampaignStats> => {
  const { data } = await api.get<{ status: string; data: NotificationCampaignStats }>(
    '/admin/notification-campaigns/stats',
  )
  return data.data
}

export const fetchSystemNotificationEvents = async (): Promise<SystemNotificationEvent[]> => {
  const { data } = await api.get<{ status: string; data: { events: SystemNotificationEvent[] } }>(
    '/admin/notification-campaigns/system-events',
  )
  return data.data.events
}

export const fetchNotificationCampaign = async (id: string): Promise<NotificationCampaign> => {
  const { data } = await api.get<{ status: string; data: { campaign: NotificationCampaign } }>(
    `/admin/notification-campaigns/${id}`,
  )
  return data.data.campaign
}

export interface NotificationCampaignPayload {
  title: string
  message: string
  bannerImageKey: string | null
  audience: NotificationAudience
  specificUserIds: string[]
  type: NotificationCampaignType
  action: 'draft' | 'publish'
  scheduledAt: string | null
}

export const createNotificationCampaign = async (
  payload: NotificationCampaignPayload,
): Promise<NotificationCampaign> => {
  const { data } = await api.post<{ status: string; data: { campaign: NotificationCampaign } }>(
    '/admin/notification-campaigns',
    payload,
  )
  return data.data.campaign
}

export const updateNotificationCampaign = async (
  id: string,
  payload: NotificationCampaignPayload,
): Promise<NotificationCampaign> => {
  const { data } = await api.patch<{ status: string; data: { campaign: NotificationCampaign } }>(
    `/admin/notification-campaigns/${id}`,
    payload,
  )
  return data.data.campaign
}

export const duplicateNotificationCampaign = async (id: string): Promise<NotificationCampaign> => {
  const { data } = await api.post<{ status: string; data: { campaign: NotificationCampaign } }>(
    `/admin/notification-campaigns/${id}/duplicate`,
  )
  return data.data.campaign
}

export const deleteNotificationCampaign = async (id: string): Promise<void> => {
  await api.delete(`/admin/notification-campaigns/${id}`)
}

export const uploadNotificationBanner = async (
  file: File,
): Promise<{ bannerImageKey: string; bannerImageUrl: string }> => {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ status: string; data: { bannerImageKey: string; bannerImageUrl: string } }>(
    '/admin/notification-campaigns/banner-image',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data
}

export const fetchAudienceCount = async (
  audience: NotificationAudience,
  specificUserIds: string[] = [],
): Promise<number> => {
  const params = new URLSearchParams({ audience })
  if (specificUserIds.length) params.set('specificUserIds', specificUserIds.join(','))
  const { data } = await api.get<{ status: string; data: { count: number } }>(
    `/admin/notification-campaigns/audience-count?${params.toString()}`,
  )
  return data.data.count
}

// ── Announcements ────────────────────────────────────────────────────────────

export interface AnnouncementsQuery {
  page?: number
  limit?: number
  search?: string
  audience?: AnnouncementAudience | ''
  trigger?: AnnouncementTrigger | ''
  status?: AnnouncementStatus | ''
  dateFrom?: string
  dateTo?: string
}

export const fetchAnnouncements = async (
  query: AnnouncementsQuery = {},
): Promise<PaginatedResponse<{ announcements: Announcement[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.search) params.set('search', query.search)
  if (query.audience) params.set('audience', query.audience)
  if (query.trigger) params.set('trigger', query.trigger)
  if (query.status) params.set('status', query.status)
  if (query.dateFrom) params.set('dateFrom', query.dateFrom)
  if (query.dateTo) params.set('dateTo', query.dateTo)

  const { data } = await api.get<PaginatedResponse<{ announcements: Announcement[] }>>(
    `/admin/announcements?${params.toString()}`,
  )
  return data
}

export const fetchAnnouncement = async (id: string): Promise<Announcement> => {
  const { data } = await api.get<{ status: string; data: { announcement: Announcement } }>(
    `/admin/announcements/${id}`,
  )
  return data.data.announcement
}

export interface AnnouncementPayload {
  title: string
  subtitle: string | null
  description: string
  image: string | null
  type: AnnouncementType
  targetAudience: AnnouncementAudience
  selectedUsers: string[]
  selectedLocations: string[]
  triggers: AnnouncementTrigger[]
  customEventName: string | null
  primaryButtonText: string | null
  secondaryButtonText: string | null
  primaryAction: AnnouncementButtonAction
  actionTarget: string | null
  priority: AnnouncementPriority
  displayFrequency: AnnouncementDisplayFrequency
  startDate: string
  endDate: string
  activate: boolean
}

export const createAnnouncement = async (payload: AnnouncementPayload): Promise<Announcement> => {
  const { data } = await api.post<{ status: string; data: { announcement: Announcement } }>(
    '/admin/announcements',
    payload,
  )
  return data.data.announcement
}

export const updateAnnouncement = async (id: string, payload: AnnouncementPayload): Promise<Announcement> => {
  const { data } = await api.put<{ status: string; data: { announcement: Announcement } }>(
    `/admin/announcements/${id}`,
    payload,
  )
  return data.data.announcement
}

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await api.delete(`/admin/announcements/${id}`)
}

export const activateAnnouncement = async (id: string): Promise<Announcement> => {
  const { data } = await api.patch<{ status: string; data: { announcement: Announcement } }>(
    `/admin/announcements/${id}/activate`,
  )
  return data.data.announcement
}

export const deactivateAnnouncement = async (id: string): Promise<Announcement> => {
  const { data } = await api.patch<{ status: string; data: { announcement: Announcement } }>(
    `/admin/announcements/${id}/deactivate`,
  )
  return data.data.announcement
}

export const duplicateAnnouncement = async (id: string): Promise<Announcement> => {
  const { data } = await api.post<{ status: string; data: { announcement: Announcement } }>(
    `/admin/announcements/${id}/duplicate`,
  )
  return data.data.announcement
}

export const fetchAnnouncementAnalytics = async (id: string): Promise<AnnouncementAnalytics> => {
  const { data } = await api.get<{ status: string; data: { analytics: AnnouncementAnalytics } }>(
    `/admin/announcements/${id}/analytics`,
  )
  return data.data.analytics
}

export const uploadAnnouncementImage = async (
  file: File,
): Promise<{ imageKey: string; imageUrl: string }> => {
  const form = new FormData()
  form.append('image', file)
  const { data } = await api.post<{ status: string; data: { imageKey: string; imageUrl: string } }>(
    '/admin/announcements/image',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data
}

// ── Support ───────────────────────────────────────────────────────────────────

export interface SupportListFilters {
  status?: SupportStatus
  channel?: string
  category?: SupportCategory
  assignedAdmin?: string
  archived?: boolean
  search?: string
}

export const fetchSupportConversations = async (
  filters: SupportListFilters = {},
): Promise<SupportConversation[]> => {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const { data } = await api.get<{ status: string; data: { conversations: SupportConversation[] } }>(
    `/support/conversations?${params.toString()}`,
  )
  return data.data.conversations
}

export const fetchSupportConversation = async (
  id: string,
): Promise<{ conversation: SupportConversation; requester: SupportConversation['requester']; assignedAdmin: { _id: string; name: string } | null }> => {
  const { data } = await api.get<{
    status: string
    data: { conversation: SupportConversation; requester: SupportConversation['requester']; assignedAdmin: { _id: string; name: string } | null }
  }>(`/support/conversations/${id}`)
  return data.data
}

export const fetchSupportMessages = async (
  id: string,
  before?: string,
): Promise<SupportMessage[]> => {
  const params = before ? `?before=${encodeURIComponent(before)}` : ''
  const { data } = await api.get<{ status: string; data: { messages: SupportMessage[] } }>(
    `/support/conversations/${id}/messages${params}`,
  )
  return data.data.messages
}

export const sendSupportMessage = async (id: string, text: string): Promise<SupportMessage> => {
  const { data } = await api.post<{ status: string; data: { message: SupportMessage } }>(
    `/support/conversations/${id}/messages`,
    { text },
  )
  return data.data.message
}

export const uploadSupportAttachment = async (id: string, file: File): Promise<SupportMessage> => {
  const form = new FormData()
  form.append('attachment', file)
  const { data } = await api.post<{ status: string; data: { message: SupportMessage } }>(
    `/support/conversations/${id}/attachments`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  )
  return data.data.message
}

export const updateSupportConversation = async (
  id: string,
  payload: { priority?: SupportPriority; category?: SupportCategory },
): Promise<SupportConversation> => {
  const { data } = await api.patch<{ status: string; data: { conversation: SupportConversation } }>(
    `/support/conversations/${id}`,
    payload,
  )
  return data.data.conversation
}

export const assignSupportConversation = async (id: string, adminId: string): Promise<SupportConversation> => {
  const { data } = await api.patch<{ status: string; data: { conversation: SupportConversation } }>(
    `/support/conversations/${id}/assign`,
    { adminId },
  )
  return data.data.conversation
}

export const updateSupportStatus = async (id: string, status: SupportStatus): Promise<SupportConversation> => {
  const { data } = await api.patch<{ status: string; data: { conversation: SupportConversation } }>(
    `/support/conversations/${id}/status`,
    { status },
  )
  return data.data.conversation
}

export const archiveSupportConversation = async (id: string): Promise<SupportConversation> => {
  const { data } = await api.patch<{ status: string; data: { conversation: SupportConversation } }>(
    `/support/conversations/${id}/archive`,
  )
  return data.data.conversation
}

export const deleteSupportConversation = async (id: string): Promise<void> => {
  await api.delete(`/support/conversations/${id}`)
}

export const markSupportRead = async (id: string): Promise<void> => {
  await api.patch(`/support/conversations/${id}/read`)
}

export const fetchSupportNotes = async (id: string): Promise<SupportInternalNote[]> => {
  const { data } = await api.get<{ status: string; data: { notes: SupportInternalNote[] } }>(
    `/support/conversations/${id}/notes`,
  )
  return data.data.notes
}

export const addSupportNote = async (id: string, note: string): Promise<SupportInternalNote> => {
  const { data } = await api.post<{ status: string; data: { note: SupportInternalNote } }>(
    `/support/conversations/${id}/notes`,
    { note },
  )
  return data.data.note
}

export const fetchSupportDashboard = async (): Promise<SupportDashboardData> => {
  const { data } = await api.get<{ status: string; data: SupportDashboardData }>('/support/dashboard')
  return data.data
}

// ── Generated reports ─────────────────────────────────────────────────────────

export interface GeneratedReportsQuery {
  page?: number
  limit?: number
  type?: ReportType
  status?: string
}

export const fetchGeneratedReports = async (
  query: GeneratedReportsQuery = {},
): Promise<PaginatedResponse<{ reports: GeneratedReport[] }>> => {
  const params = new URLSearchParams()
  if (query.page) params.set('page', String(query.page))
  if (query.limit) params.set('limit', String(query.limit))
  if (query.type) params.set('type', query.type)
  if (query.status) params.set('status', query.status)

  const { data } = await api.get<PaginatedResponse<{ reports: GeneratedReport[] }>>(
    `/admin/reports/generated?${params.toString()}`,
  )
  return data
}

export const generateReport = async (payload: {
  type: ReportType
  format: ReportFormat
  filters?: ReportFilters
}): Promise<GeneratedReport> => {
  const { data } = await api.post<{ status: string; data: { report: GeneratedReport } }>(
    '/admin/reports/generated',
    payload,
  )
  return data.data.report
}

export const downloadReport = async (id: string): Promise<string> => {
  const { data } = await api.get<{ status: string; data: { url: string } }>(
    `/admin/reports/generated/${id}/download`,
  )
  return data.data.url
}

export const deleteReport = async (id: string): Promise<void> => {
  await api.delete(`/admin/reports/generated/${id}`)
}

export default api
