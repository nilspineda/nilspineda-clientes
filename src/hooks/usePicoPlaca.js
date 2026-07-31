import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getTodaysRestrictions, getNextRestriction } from '../utils/picoPlaca'

const STORAGE_KEY = 'picoPlaca_lastNotified'

function canNotify() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  return null
}

function hasNotifiedToday() {
  try {
    const last = localStorage.getItem(STORAGE_KEY)
    if (!last) return false
    const today = new Date().toDateString()
    return last === today
  } catch {
    return false
  }
}

function markNotifiedToday() {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toDateString())
  } catch {}
}

export function usePicoPlaca() {
  const [restrictions, setRestrictions] = useState([])

  useEffect(() => {
    setRestrictions(getTodaysRestrictions())
  }, [])

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'granted') return
    if (Notification.permission === 'denied') return
    await Notification.requestPermission()
  }, [])

  const notify = useCallback(() => {
    if (restrictions.length === 0) return
    if (hasNotifiedToday()) return

    const vehicleList = restrictions.map((r) => r.label).join(' y ')
    const platesList = restrictions.map((r) => `placas ${r.plates}`).join(', ')

    toast.warning(`Hoy es Pico y Placa para ${vehicleList} (${platesList})`, {
      duration: 8000,
      description: 'Sácale el carro de la casa o usa transporte alternativo.',
    })

    if (canNotify() === true) {
      new Notification('Pico y Placa', {
        body: `Hoy te toca: ${vehicleList} (${platesList})`,
        icon: '/icon-192.png',
      })
    }

    markNotifiedToday()
  }, [restrictions])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    if (restrictions.length > 0) {
      const timer = setTimeout(() => notify(), 2000)
      return () => clearTimeout(timer)
    }
  }, [restrictions, notify])

  const nextCarro = !restrictions.some((r) => r.id === 'carro')
    ? getNextRestriction('carro')
    : null

  const nextMoto = !restrictions.some((r) => r.id === 'moto')
    ? getNextRestriction('moto')
    : null

  return {
    restrictions,
    hasRestriction: restrictions.length > 0,
    isCarroRestricted: restrictions.some((r) => r.id === 'carro'),
    isMotoRestricted: restrictions.some((r) => r.id === 'moto'),
    nextCarro,
    nextMoto,
  }
}
