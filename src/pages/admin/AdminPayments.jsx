import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { normalizeWhatsapp } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatUtils"
import Modal from "@/components/Modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Wallet, Download, Plus, Search, Edit3, Trash2, MessageCircle, Loader2 } from "lucide-react"

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [userServices, setUserServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [searchClient, setSearchClient] = useState("")
  const [formData, setFormData] = useState({
    user_id: "", service_id: "", amount: "", payment_date: "", payment_method: "transferencia",
  })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [paymentsData, usersData, userServicesData] = await Promise.all([
        pb.collection('payments').getFullList({ sort: '-payment_date', expand: 'user_service_id,user_id' }),
        pb.collection('users').getFullList({ filter: 'role = "user"' }),
        pb.collection('user_services').getFullList({ sort: '-created', expand: 'service_id' }),
      ])
      setPayments(paymentsData || [])
      setUsers(usersData || [])
      setUserServices(userServicesData || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const payload = {
        user_id: formData.user_id,
        user_service_id: formData.service_id || null,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date || new Date().toISOString(),
        payment_method: formData.payment_method,
        status: "paid",
      }
      if (editingPayment) {
        await pb.collection('payments').update(editingPayment.id, payload)
        notify("Pago actualizado correctamente", "success")
      } else {
        await pb.collection('payments').create(payload)
        notify("Pago registrado correctamente", "success")
      }
      fetchData()
      resetForm()
    } catch (error) {
      console.error("Error guardando pago:", error)
      notify("Error al guardar pago: " + error.message, "error")
    }
  }

  function resetForm() {
    setShowModal(false)
    setEditingPayment(null)
    setFormData({ user_id: "", service_id: "", amount: "", payment_date: "", payment_method: "transferencia" })
  }

  function handleEdit(payment) {
    setEditingPayment(payment)
    setFormData({
      user_id: payment.user_id,
      service_id: payment.user_service_id || "",
      amount: payment.amount || "",
      payment_date: payment.payment_date ? payment.payment_date.split("T")[0] : "",
      payment_method: payment.payment_method || "transferencia",
    })
    setShowModal(true)
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return
    try {
      await pb.collection('payments').delete(id)
      fetchData()
      notify("Pago eliminado correctamente", "success")
    } catch (error) {
      console.error("Error eliminando pago:", error)
      notify("Error al eliminar pago", "error")
    }
  }

  async function updateStatus(paymentId, newStatus) {
    try {
      await pb.collection('payments').update(paymentId, { status: newStatus })
      fetchData()
    } catch (error) {
      console.error("Error actualizando estado:", error)
    }
  }

  // Rest of the helper functions...
  const filteredPayments = payments.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    const matchDateFrom = !dateFrom || new Date(p.payment_date) >= new Date(dateFrom)
    const matchDateTo = !dateTo || new Date(p.payment_date) <= new Date(dateTo + "T23:59:59")
    const matchSearch = !searchClient || p.expand?.user_id?.name?.toLowerCase().includes(searchClient.toLowerCase())
    return matchStatus && matchDateFrom && matchDateTo && matchSearch
  })

  const getServicesForUser = (userId) => userServices.filter((s) => s.user_id === userId)

  const totalAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const monthlyStats = () => {
    const now = new Date()
    const thisMonth = payments.filter((p) => {
      const d = new Date(p.payment_date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && p.status === "paid"
    })
    const lastMonth = payments.filter((p) => {
      const d = new Date(p.payment_date)
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() && p.status === "paid"
    })
    return {
      thisMonth: thisMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      lastMonth: lastMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      count: thisMonth.length,
    }
  }

  function exportCSV() {
    const headers = ["Cliente", "Servicio", "Monto", "Fecha", "Método", "Estado"]
    const escapeCsv = (v) => {
      if (v === null || v === undefined) return '""'
      const s = String(v)
      return `"${s.replace(/"/g, '""')}"`
    }
    const rows = filteredPayments.map((p) => [
      p.expand?.user_id?.name || "-",
      p.expand?.user_service_id?.name || p.expand?.user_service_id?.expand?.service_id?.name || "-",
      formatCurrency(p.amount),
      formatDate(p.payment_date),
      p.payment_method,
      p.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pagos_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = monthlyStats()
  const currentMonth = new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
            <p className="text-sm text-muted-foreground">Total filtrado: {formatCurrency(totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
        <Button size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{currentMonth}</p>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(stats.thisMonth)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Mes anterior</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(stats.lastMonth)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pagos este mes</p>
          <p className="text-3xl font-bold text-foreground">{stats.count}</p>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar cliente..." value={searchClient} onChange={(e) => setSearchClient(e.target.value)} className="pl-9 w-full sm:w-48 h-9" />
          </div>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Desde:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Hasta:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
          </div>
          {(filterStatus !== "all" || dateFrom || dateTo) && (
            <button onClick={() => { setFilterStatus("all"); setDateFrom(""); setDateTo("") }} className="text-sm text-muted-foreground hover:text-foreground">Limpiar filtros</button>
          )}
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={resetForm} title={editingPayment ? "Editar Pago" : "Registrar Pago"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Cliente</label>
            <select value={formData.user_id} onChange={(e) => setFormData({ ...formData, user_id: e.target.value, service_id: "" })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar cliente</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
          {formData.user_id && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Servicio (opcional)</label>
              <select value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Sin asignar a servicio</option>
                {getServicesForUser(formData.user_id).map((s) => (<option key={s.id} value={s.id}>{s.expand?.service_id?.name || s.name} {s.url_dominio ? `(${s.url_dominio})` : ""}</option>))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Monto</label>
              <input type="number" placeholder="0" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Fecha</label>
              <input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Método de pago</label>
            <select value={formData.payment_method} onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editingPayment ? "Guardar Cambios" : "Registrar Pago"}</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Servicio</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Monto</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Método</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredPayments.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No hay pagos registrados.</td></tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-muted/50 transition-all">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {payment.expand?.user_id?.whatsapp && (
                          <a href={`https://wa.me/${normalizeWhatsapp(payment.expand.user_id.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-colors">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                          </a>
                        )}
                        <span className="font-semibold text-foreground">{payment.expand?.user_id?.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {payment.expand?.user_service_id?.name || payment.expand?.user_service_id?.expand?.service_id?.name || "-"}
                      {payment.expand?.user_service_id?.url_dominio && <span className="block text-xs text-blue-500">{payment.expand?.user_service_id?.url_dominio}</span>}
                    </td>
                    <td className="px-6 py-4"><span className="px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-500 font-bold">{formatCurrency(payment.amount)}</span></td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">{formatDate(payment.payment_date)}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs bg-muted text-muted-foreground capitalize">{payment.payment_method}</span></td>
                    <td className="px-6 py-4">
                      <select value={payment.status} onChange={(e) => updateStatus(payment.id, e.target.value)} className={`text-sm border rounded-md px-3 py-1.5 ${payment.status === "paid" ? "bg-green-500/10 border-green-500/30 text-green-500" : payment.status === "pending" ? "bg-orange-500/10 border-orange-500/30 text-orange-500" : "bg-destructive/10 border-destructive/30 text-destructive"}`}>
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="failed">Fallido</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(payment)}><Edit3 className="w-4 h-4 mr-1" />Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(payment.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4 mr-1" />Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
