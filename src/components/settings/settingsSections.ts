import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import {
  SlidersHorizontal, Globe2, Wallet, ClipboardList, CreditCard, WalletCards,
  Bell, FileText, Lock, KeyRound, Info,
} from 'lucide-react'

export interface SettingsNavItem {
  id: string
  label: string
  icon: ComponentType<LucideProps>
  // Extra terms the search box matches against, beyond the visible label.
  keywords: string
}

export interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: 'General',
    items: [
      { id: 'general', label: 'General', icon: SlidersHorizontal, keywords: 'platform name support email phone country timezone' },
      { id: 'platform', label: 'Platform', icon: Globe2, keywords: 'runner registration identity phone verification commission' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'working-capital', label: 'Working Capital', icon: Wallet, keywords: 'limit trust risk matching engine runner' },
      { id: 'errand-settings', label: 'Errand Settings', icon: ClipboardList, keywords: 'maximum minimum errand value timeout acceptance confirmation' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'payments', label: 'Payments', icon: CreditCard, keywords: 'mpesa integration gateway daraja' },
      { id: 'wallets', label: 'Wallets', icon: WalletCards, keywords: 'customer wallet escrow runner earnings balance' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { id: 'notifications', label: 'Notifications', icon: Bell, keywords: 'push sms email alerts' },
    ],
  },
  {
    label: 'Legal',
    items: [
      { id: 'terms', label: 'Terms & Conditions', icon: FileText, keywords: 'legal terms conditions agreement' },
      { id: 'privacy', label: 'Privacy Policy', icon: Lock, keywords: 'legal privacy policy data' },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'authentication', label: 'Authentication', icon: KeyRound, keywords: '2fa verification login admin' },
    ],
  },
  {
    label: 'About',
    items: [
      { id: 'system-info', label: 'System Information', icon: Info, keywords: 'version backend frontend database environment deployment status' },
    ],
  },
]

export const ALL_SETTINGS_ITEMS: SettingsNavItem[] = SETTINGS_NAV.flatMap((g) => g.items)

export const DEFAULT_SETTINGS_SECTION = SETTINGS_NAV[0].items[0].id
