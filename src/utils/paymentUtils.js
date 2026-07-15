import pb from '../lib/pocketbaseClient'
import { notify } from './notify'

export async function createRecurringPayments(userServiceId, months = 12) {
  try {
    const us = await pb.collection('user_services').getOne(userServiceId, { requestKey: null })
    const created = []
    for (let i = 0; i < months; i++) {
      const paymentDate = new Date()
      paymentDate.setMonth(paymentDate.getMonth() + i)
      const record = await pb.collection('payments').create({
        user_service_id: userServiceId,
        user_id: us.user_id,
        amount: us.price || 0,
        payment_date: paymentDate.toISOString(),
        status: 'pending',
      })
      created.push(record)
    }
    return { success: true, data: created }
  } catch (err) {
    console.error('Error creating recurring payments:', err)
    return { success: false, error: err }
  }
}

export async function generateMonthlyPayments(userServiceId, count = 6) {
  try {
    const us = await pb.collection('user_services').getOne(userServiceId, { requestKey: null })

    const existingPayments = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}"`,
      requestKey: null,
    })
    const existingMonths = new Set(existingPayments.map(p => p.payment_date?.substring(0, 7)))

    const created = []
    let current, maxMonths

    if (us.no_expiry && us.start_date) {
      const start = new Date(us.start_date)
      current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
      maxMonths = count
    } else if (us.expires_at) {
      const today = new Date()
      current = new Date(today.getFullYear(), today.getMonth() + 1, 10)
      maxMonths = Infinity
    } else {
      return { success: false, error: 'El servicio no tiene fecha de inicio ni vencimiento' }
    }

    let generated = 0
    while (generated < maxMonths) {
      if (!us.no_expiry && us.expires_at && current > new Date(us.expires_at)) break

      const monthKey = current.toISOString().substring(0, 7)
      if (!existingMonths.has(monthKey)) {
        const record = await pb.collection('payments').create({
          user_service_id: userServiceId,
          user_id: us.user_id,
          amount: us.price || 0,
          payment_date: current.toISOString(),
          status: 'pending',
        })
        created.push(record)
      }

      generated++
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate())
    }

    return { success: true, data: created }
  } catch (err) {
    console.error('Error generating monthly payments:', err)
    return { success: false, error: err }
  }
}

export async function updatePendingPaymentsAmount(userServiceId) {
  try {
    const us = await pb.collection('user_services').getOne(userServiceId)
    const payments = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}" && status = "pending"`,
    })
    for (const p of payments) {
      await pb.collection('payments').update(p.id, { amount: us.price || 0 })
    }
    return { success: true }
  } catch (err) {
    console.error('Error updating pending payments:', err)
    return { success: false, error: err }
  }
}

export async function getPaymentStats(userServiceId) {
  try {
    const payments = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}"`,
    })
    const paid = payments.filter(p => p.status === 'paid')
    const pending = payments.filter(p => p.status === 'pending')
    const totalPaid = paid.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
    return {
      success: true,
      data: {
        total_paid: paid.length,
        total_amount: totalPaid,
        pending_count: pending.length,
      },
    }
  } catch (err) {
    console.error('Error getting payment stats:', err)
    return { success: false, error: err }
  }
}

export async function getPaymentsByUserService(userServiceId) {
  try {
    const data = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}"`,
      sort: 'payment_date',
      expand: 'payment_account',
      requestKey: null,
    })
    return { success: true, data }
  } catch (err) {
    console.error('Error fetching payments:', err)
    return { success: false, error: err }
  }
}

export async function updatePaymentStatus(paymentId, status) {
  try {
    const data = await pb.collection('payments').update(paymentId, { status })
    notify('Pago actualizado correctamente', 'success')
    return { success: true, data }
  } catch (err) {
    console.error('Error updating payment status:', err)
    notify('Error al actualizar el pago', 'error')
    return { success: false, error: err }
  }
}

export async function regeneratePayments(userServiceId, months = 12) {
  try {
    const pending = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}" && status = "pending"`,
    })
    for (const p of pending) {
      await pb.collection('payments').delete(p.id)
    }
    const result = await createRecurringPayments(userServiceId, months)
    if (result.success) {
      notify('Pagos regenerados correctamente', 'success')
    }
    return result
  } catch (err) {
    console.error('Exception regenerating payments:', err)
    return { success: false, error: err }
  }
}

export async function createPendingPayment(userServiceId) {
  try {
    const us = await pb.collection('user_services').getOne(userServiceId, { requestKey: null })
    const amount = us.billing_type === "one_time"
      ? (us.price || 0) - (us.monto_abonado || 0)
      : (us.price || 0)
    if (amount <= 0) return { success: false, error: 'No hay saldo pendiente' }
    const record = await pb.collection('payments').create({
      user_service_id: userServiceId,
      user_id: us.user_id,
      amount,
      payment_date: new Date().toISOString(),
      status: 'pending',
    })
    return { success: true, data: record }
  } catch (err) {
    console.error('Error creating pending payment:', err)
    return { success: false, error: err }
  }
}

export async function syncOneTimeAbono(userServiceId) {
  if (!userServiceId) return
  try {
    const us = await pb.collection('user_services').getOne(userServiceId, { requestKey: null })
    if (us.billing_type !== "one_time" || !us.requiere_abono) return
    const payments = await pb.collection('payments').getFullList({
      filter: `user_service_id = "${userServiceId}" && status = "paid"`,
      requestKey: null,
    })
    const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
    await pb.collection('user_services').update(userServiceId, { monto_abonado: totalPaid })
  } catch (err) {
    console.error("Error syncing one_time abono:", err)
  }
}

export function formatPaymentStatus(status) {
  const statusMap = {
    paid: { label: 'Pagado', color: 'green' },
    pending: { label: 'Pendiente', color: 'orange' },
    failed: { label: 'Fallido', color: 'red' },
  }
  return statusMap[status] || { label: status, color: 'gray' }
}

export async function getComprobantes(paymentId) {
  try {
    const data = await pb.collection('comprobantes').getFullList({
      filter: `payment_id = "${paymentId}"`,
      sort: 'created',
      requestKey: null,
    })
    return { success: true, data }
  } catch (err) {
    console.error('Error fetching comprobantes:', err)
    return { success: false, error: err }
  }
}

export function getComprobanteUrl(record) {
  return pb.files.getURL(record, 'file')
}

export async function addComprobante(paymentId, userId, file) {
  try {
    const fd = new FormData()
    fd.append('payment_id', paymentId)
    fd.append('user_id', userId)
    fd.append('file', file)
    const data = await pb.collection('comprobantes').create(fd)
    return { success: true, data }
  } catch (err) {
    console.error('Error adding comprobante:', err)
    return { success: false, error: err }
  }
}

export async function deleteComprobante(id) {
  try {
    await pb.collection('comprobantes').delete(id)
    return { success: true }
  } catch (err) {
    console.error('Error deleting comprobante:', err)
    return { success: false, error: err }
  }
}

export async function getComprobantesMap(paymentIds) {
  if (!paymentIds.length) return {}
  const filter = paymentIds.map(id => `payment_id = "${id}"`).join(' || ')
  try {
    const data = await pb.collection('comprobantes').getFullList({ filter, sort: 'created', requestKey: null })
    const map = {}
    data.forEach(c => {
      if (!map[c.payment_id]) map[c.payment_id] = []
      map[c.payment_id].push(c)
    })
    return map
  } catch (err) {
    console.error('Error fetching comprobantes map:', err)
    return {}
  }
}
