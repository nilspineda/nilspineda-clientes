import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Car, Bike, AlertTriangle, Calendar, X } from 'lucide-react'
import { usePicoPlaca } from '../hooks/usePicoPlaca'
import { getAllSaturdayRestrictions } from '../utils/picoPlaca'

export default function PicoPlacaIndicator() {
  const { restrictions, hasRestriction, isCarroRestricted, isMotoRestricted } = usePicoPlaca()
  const [showSaturdays, setShowSaturdays] = useState(false)

  useEffect(() => {
    if (!showSaturdays) return
    const handleKey = (e) => { if (e.key === 'Escape') setShowSaturdays(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [showSaturdays])

  if (!hasRestriction) return null

  const saturdays = getAllSaturdayRestrictions()

  return (
    <>
      <button
        onClick={() => setShowSaturdays(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-red-500/10 border-red-500/30 text-red-400 text-xs sm:text-sm cursor-pointer hover:bg-red-500/20 transition-colors"
      >
        <span className="font-semibold tracking-tight">Pico y Placa</span>

        {isCarroRestricted && (
          <>
            <span className="w-px h-3.5 bg-current opacity-20" />
            <div className="flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              <span className="font-medium tabular-nums">
                {restrictions.find((r) => r.id === 'carro')?.plates}
              </span>
              <AlertTriangle className="w-3 h-3 animate-pulse hidden sm:block" />
            </div>
          </>
        )}

        {isMotoRestricted && (
          <>
            <span className="w-px h-3.5 bg-current opacity-20" />
            <div className="flex items-center gap-1.5">
              <Bike className="w-3.5 h-3.5" />
              <span className="font-medium tabular-nums">
                {restrictions.find((r) => r.id === 'moto')?.plates}
              </span>
              <AlertTriangle className="w-3 h-3 animate-pulse hidden sm:block" />
            </div>
          </>
        )}
      </button>

      {showSaturdays && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] pb-8 overflow-y-auto bg-black/60 backdrop-blur-sm"
          onClick={() => setShowSaturdays(false)}
        >
          <div
            className="bg-card border border-border/50 rounded-xl w-full max-w-sm mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Sábados de Pico y Placa</h3>
              </div>
              <button
                onClick={() => setShowSaturdays(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {saturdays.map((s) => (
                <div key={s.id}>
                  <div className="flex items-center gap-2 mb-2">
                    {s.id === 'carro' ? (
                      <Car className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Bike className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">
                      {s.label} (placas {s.plates})
                    </span>
                  </div>
                  <ul className="space-y-1 ml-6">
                    {s.saturdays.map((d, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        {d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="pt-3 border-t border-border/50">
                <p className="text-[11px] text-muted-foreground/60">
                  Periodo: 6 de julio al 3 de octubre de 2026
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
