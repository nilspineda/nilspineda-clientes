import PocketBase from 'pocketbase'
import webpush from 'web-push'

const PB_URL = process.env.VITE_POCKETBASE_URL || process.env.PB_URL || 'http://localhost:8090'
const PB_EMAIL = process.env.PB_SUPERUSER_EMAIL
const PB_PASSWORD = process.env.PB_SUPERUSER_PASSWORD
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@nilspineda.com'
const CRON_SECRET = process.env.CRON_SECRET

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
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

async function getPBLatestNotifiedDate(pb) {
  try {
    const record = await pb.collection('settings').getFirstListItem('key = "pico_placa_last_notified"', {
      requestKey: null,
    })
    return record?.value || null
  } catch {
    return null
  }
}

async function setPBLatestNotifiedDate(pb, dateStr) {
  try {
    const record = await pb.collection('settings').getFirstListItem('key = "pico_placa_last_notified"', {
      requestKey: null,
    })
    await pb.collection('settings').update(record.id, { value: dateStr })
  } catch {
    await pb.collection('settings').create({ key: 'pico_placa_last_notified', value: dateStr })
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' })
  }

  if (CRON_SECRET) {
    const auth = request.headers.get('authorization') || ''
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
    const lastNotified = await getPBLatestNotifiedDate(pb)
    const todayStr = formatTodayUTC()
    if (lastNotified !== todayStr) {
      const vehicleList = restrictions.map((r) => r.label).join(' y ')
      const platesList = restrictions.map((r) => `placas ${r.plates}`).join(', ')
      messages.push({
        title: 'Pico y Placa',
        body: `Hoy te toca: ${vehicleList} (${platesList})`,
        tag: 'pico-placa',
        data: { url: '/dashboard' },
      })
      await setPBLatestNotifiedDate(pb, todayStr)
    }
  }

  {
    const todayStr = formatTodayUTC()
    const tasks = await pb.collection('personal_tasks').getFullList({
      filter: `due_date >= "${todayStr} 00:00:00" && due_date <= "${todayStr} 23:59:59" && completed = false && reminded_today = false`,
      requestKey: null,
    })
    if (tasks.length > 0) {
      const titles = tasks.map((t) => t.title).join(', ')
      messages.push({
        title: `Tienes ${tasks.length} tarea${tasks.length > 1 ? 's' : ''} para hoy`,
        body: titles,
        tag: 'tasks-today',
        data: { url: '/admin/personal/tasks' },
      })
      for (const task of tasks) {
        await pb.collection('personal_tasks').update(task.id, { reminded_today: true })
      }
    }
  }

  if (messages.length === 0) {
    return response.status(200).json({ notified: false, reason: 'no content to notify' })
  }

  const subscriptions = await pb.collection('push notifications').getFullList({
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
          await pb.collection('push notifications').delete(sub.id)
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