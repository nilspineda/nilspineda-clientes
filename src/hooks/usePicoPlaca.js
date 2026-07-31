import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { getTodaysRestrictions, getNextRestriction } from '../utils/picoPlaca'

export function usePicoPlaca() {
  const [restrictions, setRestrictions] = useState([])

  useEffect(() => {
    setRestrictions(getTodaysRestrictions())
  }, [])

  const notify = useCallback(() => {
    if (restrictions.length === 0) return

    const vehicleList = restrictions.map((r) => r.label).join(' y ')
    const platesList = restrictions.map((r) => `placas ${r.plates}`).join(', ')

    toast.warning(`Hoy es Pico y Placa para ${vehicleList} (${platesList})`, {
      duration: 8000,
      description: 'Sácale el carro de la casa o usa transporte alternativo.',
    })
  }, [restrictions])

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
