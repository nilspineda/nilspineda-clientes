import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabaseClient'
import { formatDate } from '../utils/dateUtils'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [services, setServices] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  useEffect(() => {
    fetchData()
    fetchSettings()
  }, [user])

  async function fetchData() {
    if (!user) return

    const [servicesRes, paymentsRes] = await Promise.all([
      supabase
        .from('user_services')
        .select('*, services(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payments')
        .select('*, services(*)')
        .eq('user_id', user.id)
        .order('payment_date', { ascending: false })
        .limit(10)
    ])

    if (!servicesRes.error) setServices(servicesRes.data)
    if (!paymentsRes.error) setPayments(paymentsRes.data)
    setLoading(false)
  }

  async function fetchSettings() {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'whatsapp_support')
      .single()

    if (data) setWhatsappNumber(data.value)
  }

  function handleRenew(service) {
    const message = encodeURIComponent(`Hola, quiero renovar mi servicio: ${service.services?.name}`)
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Card Bienvenida Premium */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[#0f2926] p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-primary-light/80">Cuenta activa</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">{profile?.name}</h1>
              <p className="text-lg text-primary-light/70">
                {profile?.dominio ? `🌐 ${profile.dominio}` : 'Sin dominio registrado'}
              </p>
            </div>
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {profile?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{services.filter(s => s.status === 'active').length}</p>
              <p className="text-xs text-primary-light/60">Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{services.filter(s => s.status === 'pending').length}</p>
              <p className="text-xs text-primary-light/60">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{payments.length}</p>
              <p className="text-xs text-primary-light/60">Pagos</p>
            </div>
          </div>
        </div>

        {/* Card Servicios */}
        <Card titulo="Mis Servicios" icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">No tienes servicios contratados</p>
              <p className="text-gray-500 text-sm mt-1">Contacta al administrador para agregar servicios</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map(service => (
                <div key={service.id} className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card-bg to-sidebar-bg border border-border-dark p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
                  
                  <div className="relative flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusBadge status={service.status} />
                      </div>
                      <h3 className="font-bold text-white text-lg mb-1">{service.services?.name}</h3>
                      <p className="text-sm text-gray-400 line-clamp-2">{service.services?.description}</p>
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Precio mensual</p>
                      <p className="text-xl font-bold text-primary">${service.price || 0}</p>
                    </div>
                    <button
                      onClick={() => handleRenew(service)}
                      className="px-4 py-2 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl font-medium text-sm transition-all"
                    >
                      Renovar
                    </button>
                  </div>

                  {service.expires_at && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Vence: {formatDate(service.expires_at)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Card Pagos */}
        <Card titulo="Últimos Pagos" icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        }>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.slice(0, 5).map(payment => (
                <div key={payment.id} className="group flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-card-bg to-sidebar-bg border border-border-dark hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      payment.status === 'paid' 
                        ? 'bg-gradient-to-br from-green-500/20 to-green-600/10' 
                        : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10'
                    }`}>
                      {payment.status === 'paid' ? (
                        <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-white">{payment.services?.name || 'Servicio'}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(payment.payment_date)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${payment.amount}</p>
                    <p className="text-xs text-gray-500 capitalize">{payment.payment_method}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-6">
        {/* Card Información */}
        <Card titulo="Información" icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }>
          <div className="space-y-3">
            <InfoItem 
              label="Dominio" 
              value={profile?.dominio || 'No registrado'} 
              icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              color="blue"
            />
            <InfoItem 
              label="WhatsApp" 
              value={profile?.whatsapp || 'No registrado'} 
              icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              color="green"
              href={profile?.whatsapp ? `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}` : null}
            />
            <InfoItem 
              label="Email" 
              value={profile?.email || 'No registrado'} 
              icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              color="purple"
              href={profile?.email ? `mailto:${profile.email}` : null}
            />
          </div>
        </Card>

        {/* Card Estado */}
        <Card titulo="Estado de Cuenta" icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        }>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center border border-primary/20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-xl"></div>
            <p className="text-gray-400 text-sm mb-2">Servicios Activos</p>
            <p className="text-5xl font-bold text-primary">{services.filter(s => s.status === 'active').length}</p>
            <p className="text-primary/60 text-sm mt-2">de {services.length} total</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4 text-center border border-yellow-500/20">
              <p className="text-2xl font-bold text-yellow-400">{services.filter(s => s.status === 'pending').length}</p>
              <p className="text-xs text-yellow-400/70">Pendientes</p>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 text-center border border-red-500/20">
              <p className="text-2xl font-bold text-red-400">{services.filter(s => s.status === 'expired').length}</p>
              <p className="text-xs text-red-400/70">Vencidos</p>
            </div>
          </div>
        </Card>

        {/* Card WhatsApp */}
        {whatsappNumber && (
          <Card className="relative overflow-hidden bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl"></div>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola, necesito soporte')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex items-center gap-4 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-green-400 text-lg">Soporte WhatsApp</p>
                <p className="text-sm text-green-400/70">Haz clic para chatear</p>
              </div>
              <svg className="w-5 h-5 text-green-400 ml-auto group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </Card>
        )}
      </div>
    </div>
  )
}

function Card({ titulo, children, className = '', icon }) {
  return (
    <div className={`relative overflow-hidden bg-card-bg rounded-3xl border border-border-dark ${className}`}>
      {titulo && (
        <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border-dark">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <div className="text-primary">{icon}</div>
            </div>
          )}
          <h2 className="text-lg font-bold text-white">{titulo}</h2>
        </div>
      )}
      <div className="p-5 lg:p-6">
        {children}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 border border-green-500/30',
    pending: 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30',
    expired: 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30',
    warning: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border border-orange-500/30',
  }

  const labels = {
    active: 'Activo',
    pending: 'Pendiente',
    expired: 'Vencido',
    warning: 'Por Vencer',
  }

  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${styles[status] || styles.pending}`}>
      {labels[status] || status}
    </span>
  )
}

function InfoItem({ label, value, icon, color, href }) {
  const colorStyles = {
    blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/20' },
    purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/20' },
  }

  const style = colorStyles[color] || colorStyles.blue

  const content = (
    <div className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-card-bg to-sidebar-bg border border-border-dark hover:border-primary/30 transition-all duration-300 group ${href ? 'cursor-pointer' : ''}`}>
      <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <svg className={`w-6 h-6 ${style.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
      {href && (
        <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    )
  }

  return content
}