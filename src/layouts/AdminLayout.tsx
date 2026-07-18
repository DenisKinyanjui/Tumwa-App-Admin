import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Footprints,
  ClipboardList,
  Receipt,
  AlertTriangle,
  ArrowDownToLine,
  Wallet,
  Tag,
  MapPin,
  Bell,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useBadges } from '../context/BadgeContext'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/users', label: 'Users', icon: Users },
  { to: '/runners', label: 'Runners', icon: Footprints, badgeKey: 'runners' },
  { to: '/errands', label: 'Errands', icon: ClipboardList },
  { to: '/payments', label: 'Transactions', icon: Receipt },
  { to: '/disputes', label: 'Disputes', icon: AlertTriangle, badgeKey: 'disputes' },
  { to: '/withdrawals', label: 'Withdrawals', icon: ArrowDownToLine },
  { to: '/working-capital', label: 'Working Capital', icon: Wallet },
  { to: '/promo-codes', label: 'Promo Codes', icon: Tag },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { openDisputes, pendingVerifications } = useBadges()

  const badgeCounts: Record<string, number> = {
    disputes: openDisputes,
    runners: pendingVerifications,
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-white border-r border-gray-100 transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between gap-3 border-b border-gray-100 px-5">
          <div className="flex items-center gap-2.5">
            <img src="/images/tumwa-crest-orange.svg" alt="Tumwa" className="h-9 w-9" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold text-gray-900">TUMWA</p>
              <p className="text-[11px] font-medium text-primary-500">Get things done.</p>
            </div>
          </div>
          <button
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.label}>
                <NavLink
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-500 text-white'
                        : 'text-gray-600 hover:bg-primary-50 hover:text-primary-600'
                    }`
                  }
                >
                  <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                  <span className="flex-1">{item.label}</span>
                  {item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-[11px] font-bold text-white">
                      {badgeCounts[item.badgeKey]}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info + Logout */}
        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-bold text-white">
              {user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{user?.name ?? 'Admin'}</p>
              <p className="text-xs capitalize text-gray-400">{user?.role ?? 'admin'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile-only top bar */}
        <header className="flex h-14 items-center gap-3 border-b border-gray-100 bg-white px-4 lg:hidden">
          <button
            className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <span className="text-sm font-bold text-gray-900">TUMWA Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
