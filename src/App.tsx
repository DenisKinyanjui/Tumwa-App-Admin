import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BadgeProvider } from './context/BadgeContext'
import { SupportSocketProvider } from './context/SupportSocketContext'
import ProtectedRoute from './components/ProtectedRoute'
import SessionExpiredModal from './components/SessionExpiredModal'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Runners from './pages/Runners'
import UserDetail from './pages/UserDetail'
import IdentityVerification from './pages/IdentityVerification'
import VerificationReview from './pages/VerificationReview'
import Payments from './pages/Payments'
import Withdrawals from './pages/Withdrawals'
import Errands from './pages/Errands'
import ErrandDetail from './pages/ErrandDetail'
import Disputes from './pages/Disputes'
import WorkingCapital from './pages/WorkingCapital'
import Locations from './pages/Locations'
import Notifications from './pages/Notifications'
import NotificationDetail from './pages/NotificationDetail'
import Announcements from './pages/Announcements'
import AnnouncementDetail from './pages/AnnouncementDetail'
import Settings from './pages/Settings'
import Support from './pages/Support'
import Analytics from './pages/Analytics'
import Reports from './pages/Reports'

export default function App() {
  return (
    <AuthProvider>
      <SessionExpiredModal />
      <BadgeProvider>
        <SupportSocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<AdminLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/runners" element={<Runners />} />
                  <Route path="/identity-verification" element={<IdentityVerification />} />
                  <Route path="/identity-verification/:id" element={<VerificationReview />} />
                  <Route path="/users/:id" element={<UserDetail />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/withdrawals" element={<Withdrawals />} />
                  <Route path="/errands" element={<Errands />} />
                  <Route path="/errands/:id" element={<ErrandDetail />} />
                  <Route path="/disputes" element={<Disputes />} />
                  <Route path="/working-capital" element={<WorkingCapital />} />
                  <Route path="/locations" element={<Locations />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/notifications/:id" element={<NotificationDetail />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/announcements/:id" element={<AnnouncementDetail />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/reports" element={<Reports />} />
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </SupportSocketProvider>
      </BadgeProvider>
    </AuthProvider>
  )
}
