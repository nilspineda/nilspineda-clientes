import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatDate } from '../../utils/dateUtils'
import Modal from '../../components/Modal'

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userServices, setUserServices] = useState([])
  const [formData, setFormData] = useState({ name: '', whatsapp: '', email: '', password: '', dominio: '' })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setUsers(data || [])
    setLoading(false)
  }

  async function viewUserDetails(user) {
    setSelectedUser(user)
    const { data } = await supabase
      .from('user_services')
      .select('*, services(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    setUserServices(data || [])
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (editingUser) {
      const { error } = await supabase
        .from('profiles')
        .update({ name: formData.name, whatsapp: formData.whatsapp, dominio: formData.dominio, email: formData.email })
        .eq('id', editingUser.id)

      if (!error) {
        fetchUsers()
        resetForm()
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { name: formData.name } }
      })

      if (!error && data.user) {
        await supabase
          .from('profiles')
          .update({ whatsapp: formData.whatsapp, email: formData.email, dominio: formData.dominio })
          .eq('id', data.user.id)

        fetchUsers()
        resetForm()
      }
    }
  }

  function resetForm() {
    setShowForm(false)
    setEditingUser(null)
    setFormData({ name: '', whatsapp: '', email: '', password: '', dominio: '' })
  }

  function handleEdit(user) {
    setEditingUser(user)
    setFormData({ name: user.name, whatsapp: user.whatsapp || '', email: user.email || '', password: '', dominio: user.dominio || '' })
    setShowForm(true)
  }

  async function handleDelete(id) {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchUsers()
  }

  async function toggleUserActive(user) {
    await supabase
      .from('profiles')
      .update({ active: !user.active })
      .eq('id', user.id)
    
    fetchUsers()
    if (selectedUser?.id === user.id) {
      setSelectedUser({ ...user, active: !user.active })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (selectedUser) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setSelectedUser(null); setUserServices([]) }}
          className="flex items-center gap-2 text-primary hover:text-primary-light font-medium"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a usuarios
        </button>

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[#0f2926] p-6 lg:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-primary-light/80">Cliente</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-white">{selectedUser.name}</h1>
              <p className="text-lg text-primary-light/70">
                {selectedUser.dominio ? `🌐 ${selectedUser.dominio}` : 'Sin dominio registrado'}
              </p>
            </div>
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userServices.filter(s => s.status === 'active').length}</p>
              <p className="text-xs text-primary-light/60">Activos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userServices.filter(s => s.status === 'pending').length}</p>
              <p className="text-xs text-primary-light/60">Pendientes</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">{userServices.length}</p>
              <p className="text-xs text-primary-light/60">Total</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card-bg rounded-3xl border border-border-dark overflow-hidden">
              <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border-dark">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Servicios Contratados</h2>
              </div>
              <div className="p-5 lg:p-6">
                {userServices.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400 font-medium">No tiene servicios contratados</p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {userServices.map(service => (
                      <div key={service.id} className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-sidebar-bg to-card-bg border border-border-dark p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                        <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>
                        
                        <div className="relative flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                service.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                service.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-red-500/20 text-red-400'
                              }`}>
                                {service.status === 'active' ? 'Activo' : service.status === 'pending' ? 'Pendiente' : 'Vencido'}
                              </span>
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
                          {service.expires_at && (
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Vence</p>
                              <p className="text-sm text-gray-400">{formatDate(service.expires_at)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-card-bg rounded-3xl border border-border-dark overflow-hidden">
              <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border-dark">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-white">Información</h2>
              </div>
              <div className="p-5 lg:p-6 space-y-4">
                {selectedUser.email && (
                  <a
                    href={`mailto:${selectedUser.email}`}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-400/70 font-medium">Email</p>
                      <p className="text-sm font-semibold text-white truncate">{selectedUser.email}</p>
                    </div>
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </a>
                )}

                {selectedUser.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedUser.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-400/70 font-medium">WhatsApp</p>
                      <p className="text-sm font-semibold text-white truncate">{selectedUser.whatsapp}</p>
                    </div>
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </a>
                )}

                {selectedUser.dominio && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/20">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-purple-400/70 font-medium">Dominio</p>
                      <p className="text-sm font-semibold text-white">{selectedUser.dominio}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Usuarios</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              required
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
              <input
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
              <input
                type="text"
                placeholder="+54 9 11..."
                value={formData.whatsapp}
                onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Dominio</label>
              <input
                type="text"
                placeholder="dominio.com"
                value={formData.dominio}
                onChange={e => setFormData({...formData, dominio: e.target.value})}
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-6 py-3 border border-border-dark rounded-xl text-gray-400 hover:bg-card-hover hover:text-white transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <div className="bg-card-bg rounded-2xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-sidebar-bg to-card-bg border-b border-border-dark">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Dominio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {users.map(user => (
                <tr key={user.id} className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300">
                  <td className="px-6 py-4">
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-white font-semibold">{user.name}</span>
                    </button>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{user.email || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-sm">
                      {user.dominio || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300">{user.whatsapp || '-'}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserActive(user)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${
                        user.active !== false ? 'bg-green-500/20 border border-green-500/30' : 'bg-red-500/20 border border-red-500/30'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full transition-all duration-300 ${
                          user.active !== false ? 'translate-x-6 bg-green-400' : 'translate-x-1 bg-red-400'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(user)}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white font-medium text-sm transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-medium text-sm transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}