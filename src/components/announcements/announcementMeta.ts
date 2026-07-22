import {
  Users, User, Footprints, ShieldCheck, ShieldAlert, UserCheck, UserX, MapPin, UserSearch,
  Rocket, LogIn, LayoutDashboard, UserPlus, PackageCheck, Banknote, Hand, Sparkles,
} from 'lucide-react'
import type { AnnouncementAudience, AnnouncementTrigger } from '../../types'

export const AUDIENCE_META: Record<AnnouncementAudience, { label: string; icon: typeof Users }> = {
  everyone: { label: 'Everyone', icon: Users },
  customers: { label: 'Customers', icon: User },
  runners: { label: 'Runners', icon: Footprints },
  verified_runners: { label: 'Verified Runners', icon: ShieldCheck },
  unverified_runners: { label: 'Unverified Runners', icon: ShieldAlert },
  active_runners: { label: 'Active Runners', icon: UserCheck },
  suspended_runners: { label: 'Suspended Runners', icon: UserX },
  selected_locations: { label: 'Selected Locations', icon: MapPin },
  selected_users: { label: 'Selected Users', icon: UserSearch },
}

export const TRIGGER_META: Record<AnnouncementTrigger, { label: string; icon: typeof Rocket }> = {
  app_launch: { label: 'App Launch', icon: Rocket },
  login_success: { label: 'Login Success', icon: LogIn },
  dashboard_open: { label: 'Dashboard Open', icon: LayoutDashboard },
  first_login: { label: 'First Login', icon: UserPlus },
  errand_accepted: { label: 'Errand Accepted', icon: PackageCheck },
  errand_completed: { label: 'Errand Completed', icon: PackageCheck },
  verification_approved: { label: 'Verification Approved', icon: ShieldCheck },
  withdrawal_approved: { label: 'Withdrawal Approved', icon: Banknote },
  manual_trigger: { label: 'Manual Trigger', icon: Hand },
  custom_event: { label: 'Custom Event', icon: Sparkles },
}

// Concrete registered routes in the mobile app (Tumwa-App/src/navigation), for
// the "Open Internal App Screen" action picker. Prefix `Tab:<TabsRoot>:<Screen>`
// targets a screen nested inside a tab navigator; bare names are root-stack
// screens — the mobile AnnouncementManager parses this exact encoding.
export const INTERNAL_ROUTE_CATALOG: Array<{ value: string; label: string }> = [
  { value: 'Tab:CustomerTabs:Home', label: 'Customer · Home' },
  { value: 'Tab:CustomerTabs:Errands', label: 'Customer · My Errands' },
  { value: 'Tab:CustomerTabs:Alerts', label: 'Customer · Alerts' },
  { value: 'Tab:CustomerTabs:Profile', label: 'Customer · Profile' },
  { value: 'Wallet', label: 'Customer · Wallet' },
  { value: 'SavedAddresses', label: 'Customer · Saved Addresses' },
  { value: 'PaymentMethods', label: 'Customer · Payment Methods' },
  { value: 'Favorites', label: 'Customer · Favorite Runners' },
  { value: 'Tab:RunnerTabs:RunnerDashboard', label: 'Runner · Dashboard' },
  { value: 'Tab:RunnerTabs:BrowseErrands', label: 'Runner · Browse Errands' },
  { value: 'Tab:RunnerTabs:MyJobs', label: 'Runner · My Jobs' },
  { value: 'Tab:RunnerTabs:Wallet', label: 'Runner · Wallet' },
  { value: 'Tab:RunnerTabs:Alerts', label: 'Runner · Alerts' },
  { value: 'Tab:RunnerTabs:Profile', label: 'Runner · Profile' },
  { value: 'IdentityVerification', label: 'Runner · Identity Verification' },
  { value: 'TransactionHistory', label: 'Runner · Transaction History' },
  { value: 'Performance', label: 'Runner · Performance' },
  { value: 'RatingsReviews', label: 'Runner · Ratings & Reviews' },
  { value: 'HelpCenter', label: 'Help Center' },
  { value: 'ContactSupport', label: 'Contact Support' },
  { value: 'AboutTumwa', label: 'About Tumwa' },
  { value: 'PrivacyPolicy', label: 'Privacy Policy' },
  { value: 'EditProfile', label: 'Edit Profile' },
]
