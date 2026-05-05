import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  if (!user) return null

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="text-xl font-bold text-gray-900">
          Nilspineda
        </Link>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{profile?.name}</span>
          {isAdmin && (
            <Link to="/admin" className="text-sm text-blue-600 hover:text-blue-800">
              Admin
            </Link>
          )}
          {!isAdmin && (
            <Link to="/dashboard" className="text-sm text-blue-600 hover:text-blue-800">
              Mi Dashboard
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </nav>
  )
}
