// ── User ──────────────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'runner' | 'admin'

export interface UserWallet {
  floatBalance: number
  heldFloat: number
  earnings: number
  trustBalance: number
}

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

export type VerificationStatus = 'pending' | 'approved' | 'rejected'

export interface RunnerVerification {
  _id: string
  nationalId: string
  idFrontUrl: string
  idBackUrl: string
  selfieUrl: string
  meansOfTransport: 'motorbike' | 'bicycle' | 'car' | 'on_foot' | 'public_transport'
  areasOfOperation: string[]
  status: VerificationStatus
  adminNotes: string | null
  submittedAt: string
  reviewedAt: string | null
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

export type PaymentType = 'errand_payment' | 'float_deposit' | 'withdrawal' | 'dispute_refund'
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
  floatUsed: boolean
  ownMoneyUsed: boolean
  floatReleased: boolean
  status: ErrandStatus
  proofOfCompletion: string | null
  assignedAt: string | null
  startedAt: string | null
  completedAt: string | null
  confirmedAt: string | null
  cancelledAt: string | null
  disputedAt: string | null
  disputeReason: string | null
  cancelledBy: 'customer' | 'runner' | 'admin' | null
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
    failedCount: number
    inPeriodRevenue: { count: number; total: number }
    paymentSuccessRate: number
    netBalance: number
  }
  disputes: {
    total: number
    byStatus: Record<string, number>
    inPeriod: number
  }
  trustWallet: { totalWalletBalance: number; totalLockedFunds: number }
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
