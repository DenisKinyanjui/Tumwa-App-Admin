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

// ── Analytics Overview ────────────────────────────────────────────────────────

export interface OverviewData {
  period: { since: string; to: string }
  users: {
    total: number
    customers: { total: number; active: number }
    runners: { total: number; active: number }
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
