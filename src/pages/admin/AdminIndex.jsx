import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function AdminIndex() {
  const [stats, setStats] = useState({
    users: 0,
    services: 0,
    activeServices: 0,
    totalRevenue: 0
  })
  const [recentServices, setRecentServices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    const [usersRes, servicesRes, userServicesRes, paymentsRes] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('services').select('id', { count: 'exact', head: true }),
      supabase.from('user_services').select('*').eq('status', 'active'),
      supabase.from('payments').select('amount').eq('status', 'paid')
    ])

    const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0) || 0

    setStats({
      users: usersRes.count || 0,
      services: servicesRes.count || 0,
      activeServices: userServicesRes.data?.length || 0,
      totalRevenue
    })

    const { data } = await supabase
      .from('user_services')
      .select('*, services(*), profiles!inner(name)')
      .order('created_at', { ascending: false })
      .limit(5)

    setRecentServices(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard 
          title="Usuarios" 
          value={stats.users} 
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          color="blue"
        />
        <StatCard 
          title="Servicios" 
          value={stats.services} 
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
          color="purple"
        />
        <StatCard 
          title="Activos" 
          value={stats.activeServices} 
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="green"
        />
        <StatCard 
          title="Ingresos" 
          value={`$${stats.totalRevenue.toLocaleString()}`} 
          icon={
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="yellow"
        />
      </div>

      {/* Recent Assignments */}
      <div className="bg-card-bg rounded-3xl border border-border-dark overflow-hidden">
        <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border-dark">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Asignaciones Recientes</h2>
        </div>
        <div className="p-5 lg:p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentServices.map(item => (
              <div key={item.id} className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar-bg to-card-bg border border-border-dark p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="font-bold text-white text-lg">{item.profiles?.name}</p>
                    <p className="text-sm text-gray-400 mt-1">{item.services?.name}</p>
                  </div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    item.status === 'active' ? 'bg-green-500/20' :
                    item.status === 'pending' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    <div className={`w-3 h-3 rounded-full ${
                      item.status === 'active' ? 'bg-green-400' :
                      item.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}></div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-border-dark flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-sm font-semibold text-primary">${item.price || 0}/mes</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color }) {
  const colorStyles = {
    blue: { bg: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    purple: { from: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    green: { bg: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30', text: 'text-green-400' },
    yellow: { bg: 'from-yellow-500/20 to-yellow-600/10', border: 'border-yellow-500/30', text: 'text-yellow-400' },
  }

  const style = colorStyles[color] || colorStyles.blue

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card-bg to-sidebar-bg border border-border-dark p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group">
      <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors"></div>
      
      <div className="relative">
        <div className={`w-12 h-12 rounded-xl ${style.bg} flex items-center justify-center mb-4`}>
          <div className={style.text}>{icon}</div>
        </div>
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm text-gray-400">{title}</p>
      </div>
    </div>
  )
}