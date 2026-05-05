import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { formatDate } from '../../utils/dateUtils'
import { generateInvoicePDF, uploadInvoicePDF } from '../../utils/pdfGenerator'
import Modal from '../../components/Modal'

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ user_id: '', service_id: '', amount: '', payment_method: 'transferencia' })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [paymentsRes, usersRes, servicesRes] = await Promise.all([
      supabase.from('payments').select('*, services(*), profiles(name, dominio)').order('payment_date', { ascending: false }),
      supabase.from('profiles').select('id, name').eq('role', 'user'),
      supabase.from('services').select('*')
    ])

    setPayments(paymentsRes.data || [])
    setUsers(usersRes.data || [])
    setServices(servicesRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    await supabase.from('payments').insert({
      user_id: formData.user_id,
      service_id: formData.service_id,
      amount: parseFloat(formData.amount),
      payment_method: formData.payment_method,
      status: 'paid'
    })

    fetchData()
    resetForm()
  }

  function resetForm() {
    setShowForm(false)
    setFormData({ user_id: '', service_id: '', amount: '', payment_method: 'transferencia' })
  }

  async function updateStatus(paymentId, newStatus) {
    await supabase.from('payments').update({ status: newStatus }).eq('id', paymentId)
    fetchData()
  }

  async function handleGeneratePDF(payment) {
    try {
      const { data: user } = await supabase.from('profiles').select('*').eq('id', payment.user_id).single()
      const service = services.find(s => s.id === payment.service_id)

      const blob = await generateInvoicePDF(payment, user, service)
      const url = await uploadInvoicePDF(payment.id, blob)

      await supabase.from('payments').update({ invoice_url: url }).eq('id', payment.id)
      fetchData()

      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `factura_${payment.id}.pdf`
      link.click()
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Error al generar PDF')
    }
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Pagos</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-white px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Registrar Pago
        </button>
      </div>

      {showForm && (
        <div className="bg-card-bg rounded-2xl border border-border-dark p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Registrar Pago</h2>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <select
              value={formData.user_id}
              onChange={e => setFormData({...formData, user_id: e.target.value})}
              required
              className="px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Seleccionar usuario</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <select
              value={formData.service_id}
              onChange={e => setFormData({...formData, service_id: e.target.value})}
              required
              className="px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Seleccionar servicio</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input
              type="number"
              placeholder="Monto"
              value={formData.amount}
              onChange={e => setFormData({...formData, amount: e.target.value})}
              required
              className="px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
            <select
              value={formData.payment_method}
              onChange={e => setFormData({...formData, payment_method: e.target.value})}
              className="px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="otro">Otro</option>
            </select>
            <div className="md:col-span-2 flex gap-2">
              <button
                type="submit"
                className="bg-primary text-white px-4 py-3 rounded-xl hover:bg-primary-light transition-colors"
              >
                Registrar
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
        </div>
      )}

      <div className="bg-card-bg rounded-2xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-sidebar-bg border-b border-border-dark">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Dominio</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Servicio</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Monto</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Fecha</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-primary uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {payments.map(payment => (
                <tr key={payment.id} className="hover:bg-card-hover transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{payment.profiles?.name}</td>
                  <td className="px-6 py-4 text-primary font-medium">{payment.profiles?.dominio || '-'}</td>
                  <td className="px-6 py-4 text-gray-300">{payment.services?.name || '-'}</td>
                  <td className="px-6 py-4 text-white font-medium">${payment.amount}</td>
                  <td className="px-6 py-4 text-gray-400">{formatDate(payment.payment_date)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-500/20 text-green-400' :
                      payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {payment.status === 'paid' ? 'Pagado' : payment.status === 'pending' ? 'Pendiente' : 'Fallido'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleGeneratePDF(payment)}
                      className="text-primary hover:text-primary-light mr-4 font-medium"
                    >
                      PDF
                    </button>
                    <select
                      value={payment.status}
                      onChange={e => updateStatus(payment.id, e.target.value)}
                      className="text-sm bg-sidebar-bg border border-border-dark rounded-lg px-3 py-2 text-white"
                    >
                      <option value="paid">Pagado</option>
                      <option value="pending">Pendiente</option>
                      <option value="failed">Fallido</option>
                    </select>
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