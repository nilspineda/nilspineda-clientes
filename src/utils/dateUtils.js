import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'

const TIMEZONE = 'America/Bogota'

// Extract the calendar date (YYYY-MM-DD) from any stored value, ignoring any
// time/timezone component. Dates in this app are calendar dates in Colombia
// (Bogotá, UTC-5), so we anchor on the date part directly to avoid the
// off-by-one introduced by UTC/local conversions.
function getNaiveDateParts(value) {
  if (!value) return null
  const str = typeof value === 'string' ? value : value.toISOString?.() || String(value)
  const match = str.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) }
}

function toLocalMidnight(value) {
  const parts = getNaiveDateParts(value)
  if (!parts) return null
  // Construct in the browser's local timezone, which for Colombia clients is
  // the same calendar day as Bogotá.
  return new Date(parts.y, parts.m - 1, parts.d)
}

export function formatDate(date) {
  if (!date) return '-'
  const d = toLocalMidnight(date)
  if (!d) return '-'
  return format(d, 'dd MMM yyyy', { locale: es })
}

export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null
  const expires = toLocalMidnight(expiresAt)
  if (!expires) return null
  const today = new Date()
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return differenceInDays(expires, todayMidnight)
}

// Convert a date string (YYYY-MM-DD from <input type="date">) to the local
// ISO instant representing that exact calendar day in Colombia (Bogotá).
// Use when persisting so the stored value carries the intended day.
export function colombiaDateToISO(dateString) {
  if (!dateString) return null
  const parts = getNaiveDateParts(dateString)
  if (!parts) return null
  const local = new Date(parts.y, parts.m - 1, parts.d)
  // Convert the local midnight into the equivalent UTC instant for storage.
  return new Date(
    local.getTime() - local.getTimezoneOffset() * 60000,
  ).toISOString()
}

// Current date/time in Colombia as a Date object (useful for queries/notifications).
export function colombiaNow() {
  const now = new Date()
  const offsetMinutes = new Date(
    now.toLocaleString('en-US', { timeZone: TIMEZONE }),
  ).getTime() - now.getTime()
  return new Date(now.getTime() + offsetMinutes)
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