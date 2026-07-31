const TZ = 'America/Bogota'

const SCHEDULES = [
  {
    id: 'carro',
    label: 'Carro',
    plates: '3-4',
    weekday: 4,
    specificSaturdays: [
      new Date(2026, 6, 11),
      new Date(2026, 7, 15),
      new Date(2026, 8, 19),
    ],
  },
  {
    id: 'moto',
    label: 'Moto',
    plates: '9-0',
    weekday: 2,
    specificSaturdays: [
      new Date(2026, 7, 1),
      new Date(2026, 8, 5),
    ],
  },
]

const PERIOD = { start: new Date(2026, 6, 6), end: new Date(2026, 9, 3) }

function getColombiaDate() {
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
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
  const formatter = new Intl.DateTimeFormat('es-CO', {
    timeZone: TZ,
    weekday: 'long',
  })
  const map = { domingo: 0, lunes: 1, martes: 2, miércoles: 3, jueves: 4, viernes: 5, sábado: 6 }
  return map[formatter.format(new Date())] ?? 0
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function isInPeriod(date) {
  return date >= PERIOD.start && date <= PERIOD.end
}

export function getTodaysRestrictions() {
  const today = getColombiaDate()
  const dayOfWeek = getColombiaDayOfWeek()

  if (!isInPeriod(today)) return []

  return SCHEDULES.filter((s) => {
    const isWeekdayRestriction = dayOfWeek === s.weekday
    const isSaturdayRestriction =
      dayOfWeek === 6 &&
      s.specificSaturdays.some((d) => isSameDate(d, today))
    return isWeekdayRestriction || isSaturdayRestriction
  })
}

export function isRestrictedToday(id) {
  return getTodaysRestrictions().some((r) => r.id === id)
}

export function getNextRestriction(id) {
  const schedule = SCHEDULES.find((s) => s.id === id)
  if (!schedule) return null

  const today = getColombiaDate()
  const candidates = []

  for (let d = new Date(today); d <= PERIOD.end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    const isWeekday = dow === schedule.weekday
    const isSpecificSat =
      dow === 6 &&
      schedule.specificSaturdays.some((sd) => isSameDate(sd, d))
    if (isWeekday || isSpecificSat) {
      candidates.push(new Date(d))
    }
  }

  const next = candidates.find((d) => d > today)
  return next || null
}

export function formatDateColombia(date) {
  return date.toLocaleDateString('es-CO', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function getAllSaturdayRestrictions() {
  return SCHEDULES.map((s) => ({
    id: s.id,
    label: s.label,
    plates: s.plates,
    saturdays: s.specificSaturdays,
  }))
}

export { SCHEDULES, PERIOD }
