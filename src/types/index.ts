// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'runner' | 'admin' | 'superadmin'

export interface UserWallet {
  earnings: number
  trustBalance: number
}

export interface WorkingCapital {
  limit: number
  used: number
}

export interface CustomerWallet {
  balance: number
}

// ── App Settings ──────────────────────────────────────────────────────────────

export interface WorkingCapitalSettings {
  defaultLimit: number
  maxLimit: number
  increaseStep: number
  decreaseStep: number
  increaseCheckInterval: number
  minRatingForIncrease: number
  maxDisputeRateForIncrease: number
}

export interface GeneralSettings {
  platformName: string
  supportEmail: string
  supportPhone: string
  country: string
  timezone: string
}

export interface PlatformSettings {
  runnerRegistrationOpen: boolean
  identityVerificationRequired: boolean
  phoneVerificationRequired: boolean
  platformCommission: number
}

export interface ErrandSettingsConfig {
  maxErrandValue: number
  minErrandValue: number
  runnerAcceptanceTimeoutMin: number
  customerConfirmationTimeoutHrs: number
}

export interface WalletsSettings {
  customerWalletEnabled: boolean
  customerWalletMaxBalance: number
  escrowEnabled: boolean
  escrowAutoReleaseHrs: number
  runnerEarningsEnabled: boolean
  runnerEarningsMinWithdrawal: number
}

export interface NotificationsSettings {
  pushEnabled: boolean
  smsEnabled: boolean
  emailEnabled: boolean
}

export interface AuthenticationSettings {
  requirePhoneVerification: boolean
  requireIdentityVerification: boolean
  adminTwoFactorEnabled: boolean
}

export interface AppSettings {
  workingCapital: WorkingCapitalSettings
  general: GeneralSettings
  platform: PlatformSettings
  errandSettings: ErrandSettingsConfig
  wallets: WalletsSettings
  notifications: NotificationsSettings
  authentication: AuthenticationSettings
  updatedAt: string | null
}

export type AppSettingsPatch = Partial<{
  workingCapital: Partial<WorkingCapitalSettings>
  general: Partial<GeneralSettings>
  platform: Partial<PlatformSettings>
  errandSettings: Partial<ErrandSettingsConfig>
  wallets: Partial<WalletsSettings>
  notifications: Partial<NotificationsSettings>
  authentication: Partial<AuthenticationSettings>
}>

export interface AdminUser {
  _id: string
  name: string
  phone: string
  role: UserRole
  isActive: boolean
  level: number
  rating: number
  completedErrands: number
  disputesAgainst: number
  cancelCount: number
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected'
  wallet: UserWallet
  workingCapital?: WorkingCapital
  customerWallet?: CustomerWallet
  availability?: {
    status: 'offline' | 'available' | 'busy' | 'receiving_request'
    latitude: number | null
    longitude: number | null
    lastSeen: string | null
  }
  createdAt: string
  updatedAt: string
}

// ── Runner Verification ───────────────────────────────────────────────────────

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'resubmission_requested'

export type VerificationHistoryAction =
  | 'submitted' | 'resubmitted' | 'approved' | 'rejected' | 'resubmission_requested' | 'reopened'

export interface VerificationHistoryEntry {
  action: VerificationHistoryAction
  adminId: string | null
  adminName: string | null
  reason: string | null
  at: string
}

export interface RunnerVerification {
  _id: string
  // Present once the runner submits documents; null/empty when an admin
  // approves a runner directly without a submission.
  nationalId: string | null
  idFrontUrl: string | null
  idBackUrl: string | null
  selfieUrl: string | null
  // The runner's profile picture (User.photoKey) — separate from the KYC
  // documents above, included for side-by-side comparison on the review screen.
  profilePhotoUrl?: string | null
  meansOfTransport: 'motorbike' | 'bicycle' | 'car' | 'on_foot' | 'public_transport' | null
  areasOfOperation: string[]
  status: VerificationStatus
  adminNotes: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedBy?: { id: string | null; name: string | null }
  history?: VerificationHistoryEntry[]
}

// A row in the Identity Verification work queue — the same shape as
// RunnerVerification plus the runner's basic identity (GET /admin/verifications).
export interface VerificationQueueItem extends RunnerVerification {
  user: { _id: string; name: string; phone: string } | null
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  phone: string
  role: UserRole
}

export interface LoginResponse {
  status: string
  accessToken: string
  data: { user: AuthUser }
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  status: string
  pagination: Pagination
  data: T
}

// ── Payment ───────────────────────────────────────────────────────────────────

export type PaymentType = 'errand_payment' | 'withdrawal' | 'dispute_refund' | 'wallet_credit'
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled'

export interface Payment {
  _id: string
  type: PaymentType
  status: PaymentStatus
  amount: number
  phoneNumber: string
  customer: { _id: string; name: string; phone: string } | null
  runner: { _id: string; name: string; phone: string } | null
  errand: { _id: string; title: string; amount: number } | null
  mpesa: {
    receiptNumber: string | null
    checkoutRequestId: string | null
    conversationId: string | null
  }
  failureReason: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

// ── Errand ────────────────────────────────────────────────────────────────────

export type ErrandStatus =
  | 'pending'
  | 'marketplace'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'disputed'

export interface Errand {
  _id: string
  customer: { _id: string; name: string; phone: string } | null
  runner: { _id: string; name: string; phone: string; rating?: number; level?: number } | null
  title: string
  description: string
  location: {
    address: string
    coordinates?: { lat: number; lng: number }
  }
  amount: number
  runnerCommission: number
  platformCustomerFee: number
  platformRunnerFee: number
  totalCustomerPays: number
  runnerReceives: number
  platformEarns: number
  trustHeld: number
  capacityUsed: boolean
  capacityReleased: boolean
  excusedCancellation: boolean
  status: ErrandStatus
  proofOfCompletion: string | null
  proofPhotoUrl?: string | null
  assignedAt: string | null
  startedAt: string | null
  completedAt: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  disputedAt: string | null
  disputeReason: string | null
  cancelledBy: 'customer' | 'runner' | 'admin' | null
  cancelledByRunnerId: string | null
  cancelReason: string | null
  isPaid: boolean
  paidAt: string | null
  matchingState?: { status: 'idle' | 'searching' | 'offered' | 'no_runner' }
  createdAt: string
  updatedAt: string
}

// ── Analytics Overview ────────────────────────────────────────────────────────

export interface OverviewData {
  period: { since: string; to: string }
  users: {
    total: number
    customers: { total: number; active: number }
    runners: {
      total: number
      active: number
      verification: { pending: number; approved: number; rejected: number; none: number }
    }
    newInPeriod: Record<string, number>
  }
  errands: {
    total: number
    totalValue: number
    avgAmount: number
    completedCount: number
    pendingCount: number
    cancelledCount: number
    disputedCount: number
    completionRate: number
    inPeriod: { count: number; totalValue: number; completedCount: number }
  }
  payments: {
    revenue: { count: number; total: number }
    withdrawals: { count: number; total: number }
    pendingWithdrawals: { count: number; total: number }
    failedCount: number
    inPeriodRevenue: { count: number; total: number }
    paymentSuccessRate: number
    netBalance: number
    commission: number
  }
  disputes: {
    total: number
    byStatus: Record<string, number>
    inPeriod: number
  }
  wallets: {
    runnerWalletTotal: number
    customerWalletTotal: number
    escrowTotal: number
  }
  workingCapital: {
    totalLimit: number
    totalUsed: number
    avgUtilization: number
  }
}

// ── Errand / Payment analytics (charts) ─────────────────────────────────────────

export interface ChartPoint {
  label: string
  count?: number
  totalValue?: number
  completedCount?: number
  total?: number
  avgAmount?: number
}

export interface ErrandAnalytics {
  summary: {
    total: number
    totalValue: number
    avgAmount: number
    completedCount: number
    paidCount: number
    completionRate: number
  }
  charts: {
    timeSeries: { type: string; title: string; data: ChartPoint[] }
    byStatus: { type: string; title: string; data: ChartPoint[] }
    topLocations: { type: string; title: string; data: ChartPoint[] }
    completionTrend: { type: string; title: string; data: ChartPoint[] }
  }
}

export interface PaymentAnalytics {
  summary: {
    revenue: { count: number; total: number; avgTransaction: number }
    withdrawals: { count: number; total: number }
    failedCount: number
    pendingCount: number
    successRate: number
    netBalance: number
  }
  charts: {
    revenueSeries: { type: string; title: string; data: ChartPoint[] }
    paymentTypes: { type: string; title: string; data: ChartPoint[] }
    paymentStatus: { type: string; title: string; data: ChartPoint[] }
    withdrawalSeries: { type: string; title: string; data: ChartPoint[] }
  }
}

export interface RunnerAnalytics {
  summary: {
    totalRunners: number
    activeRunners: number
    avgRating: number
    avgCompletedErrands: number
    totalCompletedErrands: number
    totalWalletBalance: number
    runnersWithDisputes: number
  }
  charts: {
    levelDistribution: { type: string; title: string; data: ChartPoint[] }
    ratingDistribution: { type: string; title: string; data: ChartPoint[] }
    runnerGrowth: { type: string; title: string; data: ChartPoint[] }
  }
  topRunners: {
    type: string
    title: string
    data: Array<{
      _id: string
      name: string
      phone: string
      level: number
      rating: number
      completedErrands: number
      disputesAgainst: number
      disputeRate: number
      walletBalance: number
      availableBalance: number
      memberSince: string
    }>
  }
  runnerDetail: unknown | null
}

export interface CustomerAnalytics {
  summary: {
    totalCustomers: number
    activeCustomers: number
    newInPeriod: number
  }
  charts: {
    customerGrowth: { type: string; title: string; data: ChartPoint[] }
    spendDistribution: { type: string; title: string; data: ChartPoint[] }
  }
  topCustomers: {
    type: string
    title: string
    data: Array<{ name: string; phone: string; errandCount: number; totalSpend: number; avgSpend: number }>
  }
}

export interface DisputeAnalytics {
  summary: {
    total: number
    resolved: number
    pending: number
    inPeriod: number
    resolutionRate: number
    avgResolutionHours: number
  }
  charts: {
    byStatus: { type: string; title: string; data: ChartPoint[] }
    byOutcome: { type: string; title: string; data: ChartPoint[] }
    timeSeries: { type: string; title: string; data: ChartPoint[] }
  }
}

export interface LocationAnalytics {
  summary: {
    totalErrands: number
    totalValue: number
    activeRegions: number
  }
  charts: {
    topRegions: { type: string; title: string; data: ChartPoint[] }
    revenueByRegion: { type: string; title: string; data: ChartPoint[] }
    growthTrend: { type: string; title: string; data: ChartPoint[] }
  }
}

export interface VerificationAnalytics {
  summary: {
    total: number
    pending: number
    approved: number
    rejected: number
    resubmissionRequested: number
    avgReviewHours: number
  }
  charts: {
    byStatus: { type: string; title: string; data: ChartPoint[] }
    timeSeries: { type: string; title: string; data: ChartPoint[] }
  }
}

// ── Service areas ─────────────────────────────────────────────────────────────

export type ZoneStatus = 'active' | 'inactive' | 'retired'

export interface ServiceArea {
  _id: string
  name: string
  region: string
  status: ZoneStatus
  sortOrder: number
  // True until an admin edits this zone — set when it was auto-created from
  // a customer's geocoded errand location rather than typed in by an admin.
  autoDetected: boolean
  // Rolling 7-day errand count bucketed into this zone — only present on the
  // admin list endpoint (GET /admin/locations), not on individual create/update responses.
  errandCount7d?: number
  createdAt: string
  updatedAt: string
}

// ── Reports (generated files) ────────────────────────────────────────────────

export type ReportType =
  | 'revenue'
  | 'finance'
  | 'transactions'
  | 'customer_activity'
  | 'runner_performance'
  | 'errands'
  | 'verification'
  | 'withdrawals'
  | 'disputes'
  | 'locations'
  | 'promo_codes'
  | 'audit_logs'

export type ReportFormat = 'pdf' | 'xlsx' | 'csv'
export type ReportStatus = 'generating' | 'completed' | 'failed'

export interface ReportFilters {
  dateFrom?: string
  dateTo?: string
  period?: string
  location?: string
  runner?: string
  customer?: string
  status?: string
  module?: string
  action?: string
  severity?: string
  adminId?: string
}

export interface GeneratedReport {
  _id: string
  name: string
  type: ReportType
  filters: ReportFilters
  generatedBy: { _id: string; name: string } | null
  generatedAt: string
  filePath: string | null
  fileFormat: ReportFormat
  status: ReportStatus
  errorMessage: string | null
  createdAt: string
}

export interface LocationReportRow extends ServiceArea {
  errandCount: number
  revenue: number
  growthTrend: ChartPoint[]
}

export interface VerificationReportRow {
  _id: string
  user: { _id: string; name: string; phone: string } | null
  status: VerificationStatus
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: { id: string | null; name: string | null } | null
}

// ── System status ────────────────────────────────────────────────────────────

export interface SystemStatusService {
  key: string
  label: string
  operational: boolean
  detail: string
}

// ── Dispute ───────────────────────────────────────────────────────────────────

export type DisputeStatus = 'pending' | 'under_review' | 'resolved' | 'rejected'
export type ResolutionOutcome = 'runner_at_fault' | 'customer_at_fault' | 'no_action' | 'partial'

export interface DisputeResolution {
  outcome: ResolutionOutcome | null
  notes: string | null
  penaltyAmount: number | null
  refundAmount: number | null
  resolvedBy: { name: string } | null
  resolvedAt: string | null
}

export interface AdminDispute {
  _id: string
  errand: { _id: string; title: string; amount: number; status: string }
  raisedBy: { _id: string; name: string; role: string }
  customer: { _id: string; name: string; phone: string }
  runner: { _id: string; name: string; phone: string; rating: number }
  reason: string
  description: string
  evidence: string[]
  status: DisputeStatus
  fundsLockedAtDispute: boolean
  resolution: DisputeResolution
  createdAt: string
  updatedAt: string
}

// ── Notifications (admin-composed push campaigns) ───────────────────────────
// Backed by GET/POST/PATCH/DELETE /api/admin/notification-campaigns.

export type NotificationAudience = 'all' | 'customers' | 'runners' | 'specific'
export type NotificationCampaignType = 'system' | 'promotion' | 'announcement' | 'reminder'
export type NotificationCampaignStatus = 'draft' | 'scheduled' | 'sent' | 'failed'

export interface NotificationCampaignUser {
  _id: string
  name: string
  phone: string
  role: UserRole
}

export interface NotificationCampaign {
  _id: string
  title: string
  message: string
  bannerImageKey: string | null
  // Short-lived signed R2 URL, re-resolved by the backend on every read.
  bannerImageUrl: string | null
  audience: NotificationAudience
  // Populated user objects on GET :id, plain ObjectId strings on list.
  specificUserIds: Array<string | NotificationCampaignUser>
  type: NotificationCampaignType
  status: NotificationCampaignStatus
  scheduledAt: string | null
  sentAt: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
  recipients: number
  delivered: number
  opened: number
  failed: number
  failureReason: string | null
}

export interface NotificationCampaignStats {
  totalSent: number
  scheduled: number
  drafts: number
  failedDeliveries: number
}

// ── Announcements (in-app modal/banner/bottom-sheet) ────────────────────────
// Backed by /api/admin/announcements. Kept entirely separate from the push
// notification campaigns above — announcements are shown inside the app
// while it's actively in use, not delivered to the OS notification tray.

export type AnnouncementType = 'modal' | 'top_banner' | 'bottom_sheet'

export type AnnouncementAudience =
  | 'everyone' | 'customers' | 'runners' | 'verified_runners' | 'unverified_runners'
  | 'active_runners' | 'suspended_runners' | 'selected_locations' | 'selected_users'

export type AnnouncementTrigger =
  | 'app_launch' | 'login_success' | 'dashboard_open' | 'first_login'
  | 'errand_accepted' | 'errand_completed' | 'verification_approved' | 'withdrawal_approved'
  | 'manual_trigger' | 'custom_event'

export type AnnouncementButtonAction = 'close' | 'external_url' | 'internal_screen' | 'contact_support'
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'critical'
export type AnnouncementDisplayFrequency =
  | 'once_ever' | 'once_per_version' | 'once_per_session' | 'every_trigger' | 'until_dismissed'
export type AnnouncementStatus = 'draft' | 'scheduled' | 'active' | 'expired'

export interface AnnouncementLocation {
  _id: string
  name: string
  region: string
}

export interface Announcement {
  _id: string
  title: string
  subtitle: string | null
  description: string
  image: string | null
  // Short-lived signed R2 URL, re-resolved by the backend on every read.
  imageUrl: string | null
  type: AnnouncementType
  targetAudience: AnnouncementAudience
  // Populated user/location objects on GET :id, plain ObjectId strings on list.
  selectedUsers: Array<string | NotificationCampaignUser>
  selectedLocations: Array<string | AnnouncementLocation>
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
  // Derived server-side from active + startDate/endDate — never stored.
  status: AnnouncementStatus
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  // Present on list rows only (lightweight per-row counts).
  views: number
  clicks: number
}

export interface AnnouncementAnalytics {
  views: number
  dismissals: number
  clicks: number
  ctr: number
  lastSeen: string | null
  activeUsersReached: number
  timeSeries: Array<{ date: string; views: number; clicks: number }>
}

export type SystemNotificationTrigger =
  | 'runner_verified'
  | 'withdrawal_approved'
  | 'payment_successful'
  | 'errand_assigned'
  | 'errand_cancelled'
  | 'dispute_resolved'

export interface SystemNotificationEvent {
  key: SystemNotificationTrigger
  label: string
  description: string
  audience: 'customers' | 'runners'
  totalSent: number
  last24h: number
  lastTriggeredAt: string | null
}

// ── Support Center ────────────────────────────────────────────────────────────

export type SupportStatus = 'open' | 'waiting_user' | 'waiting_admin' | 'resolved' | 'closed'
export type SupportPriority = 'low' | 'medium' | 'high' | 'critical'
export type SupportCategory =
  | 'payments'
  | 'verification'
  | 'withdrawals'
  | 'errands'
  | 'technical_issue'
  | 'account'
  | 'refund'
  | 'general_inquiry'
  | 'other'
export type SupportChannel = 'live_chat' | 'whatsapp' | 'email' | 'call'

export interface SupportRequester {
  id: string
  name: string
  phone: string
  role: 'customer' | 'runner'
  isActive: boolean
  verificationStatus: string
  photoUrl: string | null
}

export interface SupportConversation {
  _id: string
  participants: string[]
  requesterId: string
  requesterRole: 'customer' | 'runner'
  assignedAdmin: string | null
  status: SupportStatus
  priority: SupportPriority
  category: SupportCategory
  channel: SupportChannel
  lastMessage: string | null
  lastActivity: string
  unreadCounts: { customer: number; admin: number }
  archived: boolean
  resolvedAt: string | null
  closedAt: string | null
  createdAt: string
  updatedAt: string
  // Present on admin list/detail responses only.
  requester?: SupportRequester | null
}

export interface SupportAttachment {
  key: string
  mimeType: string
  fileName: string
  size: number
  url?: string
}

export interface SupportMessage {
  _id: string
  conversationId: string
  senderId: string
  senderRole: 'customer' | 'runner' | 'admin' | 'superadmin' | 'system'
  message: string | null
  messageType: 'text' | 'image' | 'pdf' | 'system'
  attachment: SupportAttachment | null
  readBy: Array<{ user: string; readAt: string }>
  delivered: boolean
  createdAt: string
}

export interface SupportInternalNote {
  _id: string
  conversationId: string
  adminId: string | { _id: string; name: string }
  note: string
  createdAt: string
}

export interface SupportDashboardData {
  summary: {
    open: number
    waitingAdmin: number
    waitingUser: number
    resolvedToday: number
  }
  channels: Record<SupportChannel, number>
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export type AuditModule =
  | 'Users' | 'Runners' | 'Errands' | 'Transactions' | 'Withdrawals' | 'Verification'
  | 'Working Capital' | 'Customer Wallet' | 'Escrow' | 'Disputes' | 'Notifications'
  | 'Announcements' | 'Locations' | 'Reports' | 'Analytics' | 'Promo Codes' | 'Settings' | 'Admin Users'

export type AuditAction =
  | 'Created' | 'Updated' | 'Deleted' | 'Approved' | 'Rejected' | 'Suspended'
  | 'Activated' | 'Refunded' | 'Login' | 'Logout' | 'Password Reset' | 'Settings Changed'

export type AuditSeverity = 'Low' | 'Medium' | 'High' | 'Critical'
export type AuditStatus = 'success' | 'failed'

export interface AuditLogEntry {
  _id: string
  actor: { id: string; name: string; email: string | null; role: string }
  action: AuditAction
  module: AuditModule
  severity: AuditSeverity
  target: { type: string | null; id: string | null; label: string | null } | null
  changes: { before: unknown; after: unknown } | null
  reason: string | null
  requestId: string | null
  ip: string | null
  device: { browser: string | null; os: string | null; device: string | null; userAgent: string | null } | null
  sessionId: string | null
  status: AuditStatus
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface AuditLogStats {
  totalEvents: number
  eventsToday: number
  highRiskEvents: number
  failedActions: number
  mostActiveAdmin: { id: string; name: string; count: number } | null
}

export interface AuditSecurityInsight {
  id: string
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
}
