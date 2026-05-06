import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Footer from '../components/Footer'

function Sidebar({ onClose }) {
  const { profile, isAdmin, signOut } = useAuth()
  const location = useLocation()

  const clienteLinks = [
    { path: '/dashboard', label: 'Panel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]

  const adminLinks = [
    { path: '/admin', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { path: '/admin/users', label: 'Usuarios', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { path: '/admin/services', label: 'Servicios', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { path: '/admin/assignments', label: 'Asignaciones', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { path: '/admin/payments', label: 'Pagos', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  ]

  const links = isAdmin ? adminLinks : clienteLinks

  async function handleSignOut() {
    await signOut()
  }

  return (
    <aside className="w-56 h-screen fixed left-0 top-0 bg-sidebar border-r border-border flex flex-col z-50">
      <div className="p-4 border-b border-border">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="text-lg font-semibold text-foreground">
          Nilspineda
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">{isAdmin ? 'Panel Admin' : 'Mi Cuenta'}</p>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              location.pathname === link.path
                ? 'bg-primary text-primary-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
            </svg>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 mb-2 px-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
            {profile?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.dominio || 'Sin dominio'}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

function BottomNav() {
  const { isAdmin } = useAuth()
  const location = useLocation()

  const clienteLinks = [
    { path: '/dashboard', label: 'Panel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]

  const adminLinks = [
    { path: '/admin', label: 'Admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  ]

  const links = isAdmin ? adminLinks : clienteLinks

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border p-2 z-50 lg:hidden">
      <div className="flex justify-around">
        {links.map(link => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-colors ${
              location.pathname === link.path
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
            </svg>
            <span className="text-xs font-medium">{link.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}

function MobileMenuButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden fixed top-3 left-3 z-50 p-2 bg-sidebar rounded-md border border-border"
    >
      <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  )
}

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar onClose={() => setMobileMenuOpen(false)} />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 lg:ml-56 min-h-screen pb-20 lg:pb-0 flex flex-col">
        <MobileMenuButton onClick={() => setMobileMenuOpen(true)} />
        <div className="p-4 lg:p-6 flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>

      <BottomNav />
    </div>
  )
}