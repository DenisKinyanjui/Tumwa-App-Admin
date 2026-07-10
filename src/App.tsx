import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { BadgeProvider } from './context/BadgeContext'
import ProtectedRoute from './components/ProtectedRoute'
import SessionExpiredModal from './components/SessionExpiredModal'
import AdminLayout from './layouts/AdminLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Runners from './pages/Runners'
import UserDetail from './pages/UserDetail'
import Payments from './pages/Payments'
import Errands from './pages/Errands'
import ErrandDetail from './pages/ErrandDetail'
import Disputes from './pages/Disputes'
import Settings from './pages/Settings'

export default function App() {
  return (
    <AuthProvider>
      <SessionExpiredModal />
      <BadgeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/users" element={<Users />} />
                <Route path="/runners" element={<Runners />} />
                <Route path="/users/:id" element={<UserDetail />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/errands" element={<Errands />} />
                <Route path="/errands/:id" element={<ErrandDetail />} />
                <Route path="/disputes" element={<Disputes />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </BadgeProvider>
    </AuthProvider>
  )
}
