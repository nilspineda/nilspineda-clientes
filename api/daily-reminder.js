import PocketBase from 'pocketbase'
import webpush from 'web-push'

const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'http://localhost:8090'
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL
const PB_PASSWORD = process.env.PB_SUPERUSER_PASSWORD
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@nilspineda.com'
const CRON_SECRET = process.env.CRON_SECRET

function normalizeVapidSubject(subject) {
  const trimmed = String(subject || '').trim()
  if (!trimmed) return 'mailto:admin@nilspineda.com'
  if (/^mailto:/i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return trimmed
  return `mailto:${trimmed}`
}

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(normalizeVapidSubject(VAPID_SUBJECT), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

function getColombiaDate() {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = formatter.formatToParts(new Date())
  const year = Number(parts.find((p) => p.type === 'year').value)
  const month = Number(parts.find((p) => p.type === 'month').value) - 1
  const day = Number(parts.find((p) => p.type === 'day').value)
  return new Date(year, month, day)
}

function getColombiaDayOfWeek() {
  const formatter = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', weekday: 'long' })
  const map = { domingo: 0, lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6 }
  return map[formatter.format(new Date())] ?? 0
}

const SCHEDULES = [
  {
    id: 'carro', label: 'Carro', plates: '3-4', weekday: 4,
    specificSaturdays: [
      new Date(2026, 6, 11),
      new Date(2026, 7, 15),
      new Date(2026, 8, 19),
    ],
  },
  {
    id: 'moto', label: 'Moto', plates: '9-0', weekday: 2,
    specificSaturdays: [
      new Date(2026, 7, 1),
      new Date(2026, 8, 5),
    ],
  },
]
const PERIOD = { start: new Date(2026, 6, 6), end: new Date(2026, 9, 3) }
const RENEWAL_WINDOW_DAYS = 10

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function getTodaysRestrictions() {
  const today = getColombiaDate()
  const dayOfWeek = getColombiaDayOfWeek()
  if (!(today >= PERIOD.start && today <= PERIOD.end)) return []
  return SCHEDULES.filter((s) => {
    const isWeekday = dayOfWeek === s.weekday
    const isSaturday = dayOfWeek === 6 && s.specificSaturdays?.some((d) => isSameDate(d, today))
    return isWeekday || isSaturday
  })
}

function formatTodayUTC() {
  const d = getColombiaDate()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getColombiaTimeHM() {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  return formatter.format(new Date())
}

async function getPBSetting(pb, key) {
  try {
    const record = await pb.collection('settings').getFirstListItem(`key = "${key}"`, {
      requestKey: null,
    })
    return record?.value || null
  } catch {
    return null
  }
}

async function setPBSetting(pb, key, value) {
  try {
    const record = await pb.collection('settings').getFirstListItem(`key = "${key}"`, {
      requestKey: null,
    })
    await pb.collection('settings').update(record.id, { value })
  } catch {
    await pb.collection('settings').create({ key, value })
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  if (CRON_SECRET) {
    const auth = request.headers?.authorization || ''
    const expected = `Bearer ${CRON_SECRET}`
    if (auth !== expected) {
      return response.status(401).json({ error: 'Unauthorized' })
    }
  }

  const pb = new PocketBase(PB_URL)
  try {
    await pb.collection('_superusers').authWithPassword(PB_EMAIL, PB_PASSWORD)
  } catch {
    return response.status(500).json({ error: 'Failed to authenticate with PocketBase' })
  }

  const messages = []

  const restrictions = getTodaysRestrictions()
  if (restrictions.length > 0) {
    const todayStr = formatTodayUTC()
    const currentHour = getColombiaTimeHM().slice(0, 2)
    if (currentHour === '06' || currentHour === '08') {
      const key = currentHour === '06' ? 'pico_placa_last_notified_6' : 'pico_placa_last_notified_8'
      const lastNotified = await getPBSetting(pb, key)
      if (lastNotified !== todayStr) {
        const vehicleList = restrictions.map((r) => r.label).join(' y ')
        const platesList = restrictions.map((r) => `placas ${r.plates}`).join(', ')
        messages.push({
          title: 'Pico y Placa',
          body: `Hoy te toca: ${vehicleList} (${platesList})`,
          tag: 'pico-placa',
          data: { url: '/dashboard' },
        })
        await setPBSetting(pb, key, todayStr)
      }
    }
  }

  {
    const todayStr = formatTodayUTC()
    const nowHM = getColombiaTimeHM()
    const tasks = await pb.collection('personal_tasks').getFullList({
      filter: `due_date >= "${todayStr} 00:00:00" && due_date <= "${todayStr} 23:59:59" && completed = false && reminded_today = false`,
      requestKey: null,
    })

    const timed = tasks.filter((t) => t.due_time)
    const untimed = tasks.filter((t) => !t.due_time)

    for (const task of timed) {
      if (String(task.due_time).trim() > nowHM) continue
      messages.push({
        title: task.title,
        body: `Tarea para hoy a las ${task.due_time}`,
        tag: `task-${task.id}`,
        data: { url: '/admin/personal/tasks' },
      })
      await pb.collection('personal_tasks').update(task.id, { reminded_today: true })
    }

    if (untimed.length > 0 && nowHM.startsWith('06')) {
      const titles = untimed.map((t) => t.title).join(', ')
      messages.push({
        title: `Tienes ${untimed.length} tarea${untimed.length > 1 ? 's' : ''} para hoy`,
        body: titles,
        tag: 'tasks-today',
        data: { url: '/admin/personal/tasks' },
      })
      for (const task of untimed) {
        await pb.collection('personal_tasks').update(task.id, { reminded_today: true })
      }
    }
  }

  {
    const todayStr = formatTodayUTC()
    const lastRenewalNotified = await getPBSetting(pb, 'service_renewal_last_notified')
    if (lastRenewalNotified !== todayStr) {
      const userServices = await pb.collection('user_services').getFullList({
        filter: 'expires_at != null',
        expand: 'service_id,user_id',
        requestKey: null,
      })

      const now = getColombiaDate()
      const windowEnd = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000)

      const renewals = (userServices || [])
        .filter((s) => {
          if (s.no_expiry) return false
          if (s.status === 'suspended') return false
          const exp = new Date(s.expires_at)
          if (isNaN(exp.getTime())) return false
          return exp >= now && exp <= windowEnd
        })
        .sort((a, b) => new Date(a.expires_at) - new Date(b.expires_at))

      if (renewals.length > 0) {
        const lines = renewals.slice(0, 5).map((s) => {
          const exp = new Date(s.expires_at)
          const diff = exp.getTime() - now.getTime()
          const days = Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)))
          const label = days === 0 ? 'hoy' : `en ${days} día${days > 1 ? 's' : ''}`
          const name = s.expand?.service_id?.name || s.name || 'Servicio'
          const dom = s.url_dominio ? ` (${String(s.url_dominio).replace(/^https?:\/\//i, '')})` : ''
          return `• ${name}${dom} · vence ${label}`
        })
        const extra = renewals.length > 5 ? `\n+${renewals.length - 5} servicio${renewals.length - 5 > 1 ? 's' : ''} más` : ''
        messages.push({
          title: 'Renovaciones próximas',
          body: `${renewals.length} servicio${renewals.length > 1 ? 's' : ''} por vencer:\n${lines.join('\n')}${extra}`,
          tag: 'service-renewals',
          data: { url: '/dashboard' },
        })
      }

      await setPBSetting(pb, 'service_renewal_last_notified', todayStr)
    }
  }

  if (messages.length === 0) {
    return response.status(200).json({ notified: false, reason: 'no content to notify' })
  }

  const subscriptions = await pb.collection('push_notifications').getFullList({
    requestKey: null,
  })

  if (subscriptions.length === 0) {
    return response.status(200).json({ notified: false, reason: 'no subscriptions' })
  }

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return response.status(500).json({ error: 'VAPID keys not configured' })
  }

  let sentCount = 0
  let deletedCount = 0

  for (const sub of subscriptions) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.keys_p256dh,
        auth: sub.keys_auth,
      },
    }

    for (const msg of messages) {
      try {
        await webpush.sendNotification(pushSub, JSON.stringify(msg))
        sentCount++
      } catch (err) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          await pb.collection('push_notifications').delete(sub.id)
          deletedCount++
        } else {
          console.error('Error sending push:', err)
        }
      }
    }
  }

  return response.status(200).json({
    notified: true,
    messages: messages.length,
    sentCount,
    deletedCount,
  })
}