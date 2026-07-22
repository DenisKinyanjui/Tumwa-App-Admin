import { CreditCard, Landmark, Smartphone } from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import SettingsInfoShell from '../SettingsInfoShell'

interface Integration {
  name: string
  detail: string
  icon: ComponentType<LucideProps>
  status: 'connected' | 'not_configured'
}

const INTEGRATIONS: Integration[] = [
  { name: 'M-Pesa (Daraja)', detail: 'STK Push for errand payments, withdrawals paid out via B2C.', icon: Smartphone, status: 'connected' },
  { name: 'Card Payments', detail: 'Visa / Mastercard checkout for customers.', icon: CreditCard, status: 'not_configured' },
  { name: 'Bank Transfer', detail: 'Direct bank payouts for runner withdrawals.', icon: Landmark, status: 'not_configured' },
]

export default function PaymentsPanel() {
  return (
    <SettingsInfoShell
      icon={CreditCard}
      title="Payments"
      description="Payment integrations available to the platform. Managed via environment configuration on the backend — no in-app editing yet."
    >
      <div className="space-y-2.5">
        {INTEGRATIONS.map((i) => (
          <div key={i.name} className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                <i.icon className="h-5 w-5 text-gray-500" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">{i.name}</p>
                <p className="mt-0.5 truncate text-xs text-gray-400">{i.detail}</p>
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                i.status === 'connected' ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {i.status === 'connected' ? 'Connected' : 'Not configured'}
            </span>
          </div>
        ))}
      </div>
    </SettingsInfoShell>
  )
}
