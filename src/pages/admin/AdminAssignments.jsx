import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getDaysRemaining, getServiceStatus } from '../../utils/dateUtils'
import Modal from '../../components/Modal'

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ user_id: '', service_id: '', price: '', expires_at: '' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [assignmentsRes, usersRes, servicesRes] = await Promise.all([
      supabase.from('user_services').select('*, services(*), profiles(name, dominio)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'user'),
      supabase.from('services').select('*')
    ])

    setAssignments(assignmentsRes.data || [])
    setUsers(usersRes.data || [])
    setServices(servicesRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    await supabase.from('user_services').insert({
      user_id: formData.user_id,
      service_id: formData.service_id,
      price: formData.price ? parseFloat(formData.price) : null,
      expires_at: formData.expires_at || null,
      status: formData.expires_at ? 'active' : 'pending'
    })

    fetchData()
    resetForm()
  }

  function resetForm() {
    setShowForm(false)
    setFormData({ user_id: '', service_id: '', price: '', expires_at: '' })
  }

  async function updateStatus(id, newStatus) {
    await supabase.from('user_services').update({ status: newStatus }).eq('id', id)
    fetchData()
  }

  async function updateExpiresAt(id, expiresAt) {
    const status = getServiceStatus(expiresAt)
    await supabase.from('user_services').update({ expires_at: expiresAt, status }).eq('id', id)
    fetchData()
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta asignación?')) return
    await supabase.from('user_services').delete().eq('id', id)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Asignaciones</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Asignar Servicio
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title="Asignar Servicio a Usuario"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Usuario</label>
            <select
              value={formData.user_id}
              onChange={e => setFormData({...formData, user_id: e.target.value})}
              required
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Seleccionar usuario</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Servicio</label>
            <select
              value={formData.service_id}
              onChange={e => setFormData({...formData, service_id: e.target.value})}
              required
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Seleccionar servicio</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Precio mensual</label>
              <input
                type="number"
                placeholder="0.00"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fecha de vencimiento</label>
              <input
                type="date"
                value={formData.expires_at}
                onChange={e => setFormData({...formData, expires_at: e.target.value})}
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              Asignar Servicio
            </button>
            <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 border border-border-dark rounded-xl text-gray-400 hover:bg-card-hover hover:text-white transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="bg-card-bg rounded-2xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-sidebar-bg to-card-bg border-b border-border-dark">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Dominio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Servicio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Precio</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Días</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {assignments.map(assignment => {
                const daysLeft = getDaysRemaining(assignment.expires_at)
                return (
                  <tr key={assignment.id} className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                          {assignment.profiles?.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white font-semibold">{assignment.profiles?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium text-sm">
                        {assignment.profiles?.dominio || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{assignment.services?.name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
                        ${assignment.price || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="date"
                        value={assignment.expires_at ? assignment.expires_at.split('T')[0] : ''}
                        onChange={e => updateExpiresAt(assignment.id, e.target.value)}
                        className="text-sm bg-sidebar-bg border border-border-dark rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {daysLeft !== null ? (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                          daysLeft < 0 ? 'bg-red-500/10 border border-red-500/20 text-red-400' :
                          daysLeft <= 5 ? 'bg-orange-500/10 border border-orange-500/20 text-orange-400' :
                          'bg-green-500/10 border border-green-500/20 text-green-400'
                        }`}>
                          {daysLeft < 0 ? Math.abs(daysLeft) + ' dias vencido' : daysLeft + ' dias'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={assignment.status}
                        onChange={e => updateStatus(assignment.id, e.target.value)}
                        className="text-sm bg-sidebar-bg border border-border-dark rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-primary/50 outline-none"
                      >
                        <option value="active">Activo</option>
                        <option value="pending">Pendiente</option>
                        <option value="expired">Vencido</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(assignment.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-medium text-sm transition-all"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}