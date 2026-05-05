import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date) {
  if (!date) return '-'
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd MMM yyyy', { locale: es })
}

export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null
  const expires = typeof expiresAt === 'string' ? parseISO(expiresAt) : expiresAt
  return differenceInDays(expires, new Date())
}

export function getServiceStatus(expiresAt) {
  const days = getDaysRemaining(expiresAt)
  if (days === null) return 'pending'
  if (days < 0) return 'expired'
  if (days <= 5) return 'warning'
  return 'active'
}

export function getStatusLabel(status) {
  const labels = {
    active: 'Activo',
    pending: 'Pendiente',
    expired: 'Vencido',
    warning: 'Por vencer',
    paid: 'Pagado',
    failed: 'Fallido',
  }
  return labels[status] || status
}
