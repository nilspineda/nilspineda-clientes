import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, loading } = useAuth()

if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children ? children : <Outlet />
}
