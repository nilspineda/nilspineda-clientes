import { Link } from 'react-router-dom'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Nilspineda</h1>
          <p className="text-gray-400 text-lg">Gestión de clientes y servicios</p>
        </div>
        <Link
          to="/login"
          className="inline-block bg-primary text-white px-8 py-3 rounded-xl font-medium hover:bg-primary-light transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>

      <div className="mt-auto py-6">
        <Footer />
      </div>
    </div>
  )
}