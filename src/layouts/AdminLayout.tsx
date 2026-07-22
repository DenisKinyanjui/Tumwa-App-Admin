import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState, type ComponentType, type ReactNode } from 'react'
import {
  LayoutDashboard,
  Users,
  Footprints,
  ShieldCheck,
  ClipboardList,
  Receipt,
  AlertTriangle,
  ArrowDownToLine,
  Wallet,
  Tag,
  MapPin,
  Bell,
  LifeBuoy,
  Megaphone,
  BarChart3,
  FileBarChart,
  Settings,
  ScrollText,
  LogOut,
  Menu,
  X,
  Search,
  type LucideProps,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBadges } from '../context/BadgeContext'

// ── Navigation model ─────────────────────────────────────────────────────────

interface NavItem {
  to: string
  label: string
  icon: ComponentType<LucideProps>
  badgeKey?: string
}

const DASHBOARD_ITEM: NavItem = { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }

// Items whose `to` has no matching <Route> yet (see App.tsx) are
// placeholders — same convention already used for Promo Codes/Notifications/
// Reports before this change: they render, sit in their section, and fall
// through to the app's catch-all redirect until a real page exists.
const NAV_SECTIONS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Operations',
    items: [
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/runners', label: 'Runners', icon: Footprints },
      { to: '/identity-verification', label: 'Identity Verification', icon: ShieldCheck, badgeKey: 'runners' },
      { to: '/errands', label: 'Errands', icon: ClipboardList },
      { to: '/disputes', label: 'Disputes', icon: AlertTriangle, badgeKey: 'disputes' },
      { to: '/locations', label: 'Locations', icon: MapPin },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payments', label: 'Transactions', icon: Receipt },
      { to: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
      { to: '/working-capital', label: 'Working Capital', icon: Wallet },
      { to: '/promo-codes', label: 'Promo Codes', icon: Tag },
    ],
  },
  {
    label: 'Communication',
    items: [
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/support', label: 'Support', icon: LifeBuoy, badgeKey: 'support' },
      { to: '/announcements', label: 'Announcements', icon: Megaphone },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  },
]

const ALL_NAV_ITEMS: NavItem[] = [DASHBOARD_ITEM, ...NAV_SECTIONS.flatMap((s) => s.items)]

// Lets a page push a subtitle line (e.g. "24 total runners") into the
// sticky header instead of rendering its own local title block — grab it
// with `useOutletContext<LayoutOutletContext>()`. ReactNode (not just
// string) so a page can still embed e.g. an inline <Link> in its subtitle.
export interface LayoutOutletContext {
  setSubtitle: (subtitle: ReactNode) => void
}

// ── Nav button ────────────────────────────────────────────────────────────────

function NavButton({
  item, count, onNavigate,
}: {
  item: NavItem
  count?: number
  onNavigate: () => void
}) {
  return (
    <li>
      <NavLink
        to={item.to}
        onClick={onNavigate}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
            isActive ? 'bg-primary-50 text-gray-900' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`absolute left-0 top-1/2 h-8 w-[3px] -translate-y-1/2 rounded-r-full bg-primary-500 transition-opacity duration-200 ${
                isActive ? 'opacity-100' : 'opacity-0'
              }`}
            />
            <item.icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'
              }`}
              strokeWidth={1.75}
            />
            <span className="flex-1 truncate">{item.label}</span>
            {!!count && count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </>
        )}
      </NavLink>
    </li>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [subtitle, setSubtitle] = useState<ReactNode>('')
  const { openDisputes, pendingVerifications, supportUnread } = useBadges()

  // Clear whatever the previous page set so a stale subtitle never
  // flashes on the newly-loaded one before it sets its own (or doesn't).
  useEffect(() => { setSubtitle('') }, [location.pathname])

  const badgeCounts: Record<string, number> = {
    disputes: openDisputes,
    runners: pendingVerifications,
    support: supportUnread,
  }
  const alertsCount = openDisputes + pendingVerifications + supportUnread

  const activeNavItem = ALL_NAV_ITEMS.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
  )
  const pageTitle = activeNavItem?.label ?? 'Dashboard'

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const closeSidebar = () => setSidebarOpen(false)

  const searchResults = searchQuery.trim()
    ? ALL_NAV_ITEMS.filter((item) => item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : []

  const goToSearchResult = (item: NavItem) => {
    navigate(item.to)
    setSearchQuery('')
    setSearchFocused(false)
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? 'A'

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-sans">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-gray-900/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[280px] flex-col rounded-r-2xl border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:rounded-none lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between gap-3 px-6">
          <div className="flex items-center gap-3">
            <img src="/images/tumwa-crest-green.svg" alt="Tumwa" className="h-9 w-9" />
            <div className="leading-tight">
              <img src="/images/logoname-green.svg" alt="Tumwa" className="h-4" />
              {/* <p className="mt-1 text-[11px] font-medium text-gray-400">Management Portal</p> */}
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 lg:hidden"
            onClick={closeSidebar}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          <ul className="space-y-1">
            <NavButton item={DASHBOARD_ITEM} onNavigate={closeSidebar} />
          </ul>

          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="mt-6">
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                {section.label}
              </p>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <NavButton
                    key={item.to}
                    item={item}
                    count={item.badgeKey ? badgeCounts[item.badgeKey] : undefined}
                    onNavigate={closeSidebar}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Sticky header */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
          <button
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-gray-900 lg:text-lg">{pageTitle}</h1>
            <p className="hidden truncate text-[11px] text-gray-400 sm:block">
              {subtitle || `Admin / ${pageTitle}`}
            </p>
          </div>

          <div className="flex-1" />

          {/* Global search */}
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0) goToSearchResult(searchResults[0])
                if (e.key === 'Escape') { setSearchQuery(''); setSearchFocused(false) }
              }}
              className="w-64 rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-primary-400 focus:bg-white focus:ring-2 focus:ring-primary-100"
            />
            {searchFocused && searchQuery.trim() && (
              <div className="absolute right-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-100">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-gray-400">No pages match "{searchQuery}"</p>
                ) : (
                  searchResults.map((item) => (
                    <button
                      key={item.to}
                      onMouseDown={() => goToSearchResult(item)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <item.icon className="h-4 w-4 text-gray-400" strokeWidth={1.75} />
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="relative rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" strokeWidth={1.75} />
            {alertsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {alertsCount}
              </span>
            )}
          </button>

          {/* Avatar + profile menu */}
          <div className="relative">
            <button
              onClick={() => setProfileMenuOpen((o) => !o)}
              onBlur={() => setTimeout(() => setProfileMenuOpen(false), 150)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white transition hover:opacity-90"
            >
              {initials}
            </button>
            {profileMenuOpen && (
              <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1.5 shadow-lg ring-1 ring-gray-100">
                <div className="px-3.5 py-2.5">
                  <p className="truncate text-sm font-semibold text-gray-900">{user?.name ?? 'Admin'}</p>
                  <p className="text-xs capitalize text-gray-400">{user?.role ?? 'admin'}</p>
                </div>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onMouseDown={handleLogout}
                  className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-[1400px]">
            <Outlet context={{ setSubtitle } satisfies LayoutOutletContext} />
          </div>
        </main>
      </div>
    </div>
  )
}
