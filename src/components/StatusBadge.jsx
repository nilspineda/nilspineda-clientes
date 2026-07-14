import { Badge } from "@/components/ui/badge"

const variants = {
  active: "default",
  pending: "secondary",
  expired: "destructive",
  warning: "outline",
  paid: "default",
  failed: "destructive",
}

const labels = {
  active: "Activo",
  pending: "Pendiente",
  expired: "Vencido",
  warning: "Por vencer",
  paid: "Pagado",
  failed: "Fallido",
}

export default function StatusBadge({ status }) {
  return (
    <Badge variant={variants[status] || "outline"}>
      {labels[status] || status}
    </Badge>
  )
}
