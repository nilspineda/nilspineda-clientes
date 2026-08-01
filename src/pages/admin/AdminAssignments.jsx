import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { normalizeUrl, formatCurrency } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { getDaysRemaining } from "@/utils/dateUtils"
import { createRecurringPayments } from "@/utils/paymentUtils"
import Modal from "@/components/Modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, Plus, Trash2, Loader2, ExternalLink } from "lucide-react"

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState([])
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    user_id: "", service_id: "", price: "", expires_at: "", url_dominio: "", owner: 0, billing_months: 12,
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [assignmentsData, usersData, servicesData] = await Promise.all([
        pb.collection('user_services').getFullList({ sort: '-created', expand: 'service_id,user_id', requestKey: null }),
        pb.collection('users').getFullList({ filter: 'role = "user"', requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
      ])
      setAssignments(assignmentsData || [])
      setUsers(usersData || [])
      setServices(servicesData || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const url = normalizeUrl(formData.url_dominio)
    const isRecurring = formData.owner === 1
    try {
      const data = await pb.collection('user_services').create({
        user_id: formData.user_id || null,
        service_id: formData.service_id || null,
        price: formData.price ? parseFloat(formData.price) : null,
        expires_at: formData.expires_at || null,
        url_dominio: url,
        owner: formData.owner,
        next_billing_date: isRecurring ? new Date().toISOString() : null,
        status: formData.expires_at ? "active" : "pending",
      })
      if (data && isRecurring && formData.price) {
        await createRecurringPayments(data.id, formData.billing_months)
        notify("Pagos recurrentes generados", "success")
      } else {
        notify("Servicio asignado correctamente", "success")
      }
      fetchData()
      resetForm()
    } catch (error) {
      notify("Error al asignar servicio", "error")
      console.error("Error assigning service:", error)
    }
  }

  function resetForm() {
    setShowForm(false)
    setFormData({ user_id: "", service_id: "", price: "", expires_at: "", url_dominio: "", owner: 0, billing_months: 12 })
  }

  async function updateStatus(id, newStatus) {
    try {
      await pb.collection('user_services').update(id, { status: newStatus })
      fetchData()
    } catch (error) {
      console.error("Error actualizando estado:", error)
    }
  }

  async function updateExpiresAt(id, expiresAt) {
    try {
      const status = expiresAt ? (new Date(expiresAt) > new Date() ? "active" : "expired") : "pending"
      await pb.collection('user_services').update(id, { expires_at: expiresAt, status })
      fetchData()
    } catch (error) {
      console.error("Error actualizando fecha:", error)
    }
  }

  async function handleDelete(id) {
    if (!confirm("¿Eliminar esta asignación?")) return
    try {
      await pb.collection('user_services').delete(id)
      fetchData()
      notify("Asignación eliminada correctamente", "success")
    } catch (error) {
      console.error("Error eliminando asignación:", error)
      notify("Error al eliminar asignación", "error")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Asignaciones</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Asignar Servicio
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title="Asignar Servicio a Usuario" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Usuario (opcional)</label>
            <select value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar usuario</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Servicio (opcional)</label>
            <select value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar servicio</option>
              {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">URL del Dominio</label>
            <input type="url" placeholder="https://dominio.com" value={formData.url_dominio} onChange={(e) => setFormData({ ...formData, url_dominio: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Precio mensual</label>
              <input type="number" placeholder="0.00" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Fecha de vencimiento (opcional)</label>
              <input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">¿Quién paga?</label>
              <select value={formData.owner} onChange={(e) => setFormData({ ...formData, owner: parseInt(e.target.value) })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value={0}>Yo lo gestiono</option>
                <option value={1}>Cliente paga (recurrente)</option>
              </select>
            </div>
            {formData.owner === 1 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Meses de pagos a generar</label>
                <input type="number" min="1" max="24" value={formData.billing_months} onChange={(e) => setFormData({ ...formData, billing_months: parseInt(e.target.value) || 12 })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            )}
          </div>
          {formData.owner === 1 && formData.price && (
            <div className="bg-muted border border-border rounded-lg p-4">
              <p className="text-foreground font-medium">Pagos recurrentes: Se generarán {formData.billing_months} pagos de {formatCurrency(parseFloat(formData.price) || 0)} c/u</p>
              <p className="text-muted-foreground text-sm mt-1">Total: {formatCurrency((parseFloat(formData.price) || 0) * formData.billing_months)}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" className="flex-1">Asignar Servicio</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {assignments.map((assignment, index) => {
          const daysLeft = getDaysRemaining(assignment.expires_at)
          const isRecurring = assignment.owner === 1
          return (
            <div key={assignment.id} className={`p-4 rounded-xl border bg-card hover:border-primary/50 transition-all h-full ${index % 3 === 0 ? "md:col-span-2" : "md:col-span-1"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                  {assignment.expand?.user_id?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-semibold truncate">{assignment.expand?.user_id?.name}</p>
                  {isRecurring ? (
                    <Badge variant="secondary">Recurrente</Badge>
                  ) : (
                    <Badge variant="outline">Fijo</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(assignment.id)} className="text-destructive hover:text-destructive shrink-0">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Dominio</span>
                  {assignment.url_dominio ? (
                    <a href={assignment.url_dominio} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[60%]">
                      {assignment.url_dominio.replace(/^https?:\/\//, "")}
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  ) : <span className="text-foreground font-medium">-</span>}
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Servicio</span>
                  <span className="text-foreground font-medium truncate max-w-[60%]">{assignment.expand?.service_id?.name || "-"}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Precio</span>
                  <span className="px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 font-bold">{formatCurrency(assignment.price || 0)}</span>
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Vencimiento</span>
                  <input type="date" value={assignment.expires_at ? assignment.expires_at.split("T")[0] : ""} onChange={(e) => updateExpiresAt(assignment.id, e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Días</span>
                  {daysLeft !== null ? (
                    <span className={`px-3 py-1.5 rounded-md text-xs font-semibold ${daysLeft < 0 ? "bg-destructive/10 border border-destructive/20 text-destructive" : daysLeft <= 5 ? "bg-orange-500/10 border border-orange-500/20 text-orange-500" : "bg-green-500/10 border border-green-500/20 text-green-500"}`}>
                      {daysLeft < 0 ? Math.abs(daysLeft) + " dias vencido" : daysLeft + " dias"}
                    </span>
                  ) : "-"}
                </div>
                <div className="flex justify-between gap-2 items-center">
                  <span className="text-muted-foreground">Estado</span>
                  <select value={assignment.status} onChange={(e) => updateStatus(assignment.id, e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="expired">Vencido</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
