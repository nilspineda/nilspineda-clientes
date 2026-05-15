import { supabase } from '../lib/supabaseClient'
import { notify } from './notify'

export async function createRecurringPayments(userServiceId, months = 12) {
  try {
    const { data, error } = await supabase.rpc('create_recurring_payments', {
      p_user_service_id: userServiceId,
      p_months: months
    })

    if (error) {
      console.error('Error creating recurring payments:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Exception creating recurring payments:', err)
    return { success: false, error: err }
  }
}

export async function updatePendingPaymentsAmount(userServiceId) {
  try {
    const { data, error } = await supabase.rpc('update_pending_payments_amount', {
      p_user_service_id: userServiceId
    })

    if (error) {
      console.error('Error updating pending payments:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Exception updating pending payments:', err)
    return { success: false, error: err }
  }
}

export async function getPaymentStats(userServiceId) {
  try {
    const { data, error } = await supabase.rpc('get_user_service_payment_stats', {
      p_user_service_id: userServiceId
    })

    if (error) {
      console.error('Error getting payment stats:', error)
      return { success: false, error }
    }

    return { success: true, data: data?.[0] || null }
  } catch (err) {
    console.error('Exception getting payment stats:', err)
    return { success: false, error: err }
  }
}

export async function getPaymentsByUserService(userServiceId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_service_id', userServiceId)
      .order('payment_date', { ascending: true })

    if (error) {
      console.error('Error fetching payments:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Exception fetching payments:', err)
    return { success: false, error: err }
  }
}

export async function updatePaymentStatus(paymentId, status) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .update({ status })
      .eq('id', paymentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating payment status:', error)
      notify('Error al actualizar el pago', 'error')
      return { success: false, error }
    }

    notify('Pago actualizado correctamente', 'success')
    return { success: true, data }
  } catch (err) {
    console.error('Exception updating payment status:', err)
    notify('Error al actualizar el pago', 'error')
    return { success: false, error: err }
  }
}

export async function regeneratePayments(userServiceId, months = 12) {
  try {
    await supabase
      .from('payments')
      .delete()
      .eq('user_service_id', userServiceId)
      .eq('status', 'pending')

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

export function formatPaymentStatus(status) {
  const statusMap = {
    paid: { label: 'Pagado', color: 'green' },
    pending: { label: 'Pendiente', color: 'orange' },
    failed: { label: 'Fallido', color: 'red' }
  }
  return statusMap[status] || { label: status, color: 'gray' }
}