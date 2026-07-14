import { normalizeWhatsapp, formatWhatsapp } from "../utils/formatUtils"
import { MessageCircle } from "lucide-react"

export default function Footer() {
  const raw = "3167195500"
  const wa = normalizeWhatsapp(raw)
  const label = formatWhatsapp(raw) || raw

  return (
    <footer className="py-6 px-4 border-t mt-auto">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-muted-foreground">
        <p>Elaborado por Nils Pineda</p>
        <span className="hidden sm:inline">•</span>
        <a
          href={`https://wa.me/${wa}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:text-primary/80 transition-colors px-3 py-2 rounded-lg"
        >
          <MessageCircle className="w-4 h-4" />
          {label}
        </a>
      </div>
    </footer>
  )
}
