import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import AdminLayout from './layouts/AdminLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import AdminIndex from './pages/admin/AdminIndex'
import AdminUsers from './pages/admin/AdminUsers'
import AdminServices from './pages/admin/AdminServices'
import AdminPayments from './pages/admin/AdminPayments'
import AdminAssignments from './pages/admin/AdminAssignments'

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={user ? <Navigate to={profile?.role === 'admin' ? '/admin' : '/dashboard'} replace /> : <Login />} />
      
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute requireAdmin />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminIndex />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/services" element={<AdminServices />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/assignments" element={<AdminAssignments />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to={user ? (profile?.role === 'admin' ? '/admin' : '/dashboard') : '/login'} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}