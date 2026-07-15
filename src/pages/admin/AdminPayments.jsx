import { useState, useEffect, useRef } from "react"
import pb from "@/lib/pocketbaseClient"
import { normalizeWhatsapp } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatUtils"
import Modal from "@/components/Modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, Download, Plus, Search, Edit3, Trash2, MessageCircle, Loader2, Landmark, Image, X } from "lucide-react"

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [userServices, setUserServices] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [filterAccount, setFilterAccount] = useState("")
  const [searchClient, setSearchClient] = useState("")
  const [newAccountName, setNewAccountName] = useState("")
  const [formData, setFormData] = useState({
    user_id: "", service_id: "", amount: "", payment_date: "", payment_account: "",
  })
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [comprobantePreview, setComprobantePreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [paymentsData, usersData, userServicesData, accountsData] = await Promise.all([
        pb.collection('payments').getFullList({ sort: '-payment_date', expand: 'user_service_id,user_id,payment_account', requestKey: null }),
        pb.collection('users').getFullList({ filter: 'role = "user"', requestKey: null }),
        pb.collection('user_services').getFullList({ sort: '-created', expand: 'service_id', requestKey: null }),
        pb.collection('payment_accounts').getFullList({ sort: 'name', requestKey: null }),
      ])
      setPayments(paymentsData || [])
      setUsers(usersData || [])
      setUserServices(userServicesData || [])
      setPaymentAccounts(accountsData || [])
    } catch (err) {
      console.error("Error fetching data:", err)
    }
    setLoading(false)
  }

  async function createAccount() {
    if (!newAccountName.trim()) return
    try {
      await pb.collection('payment_accounts').create({ name: newAccountName.trim() })
      setNewAccountName("")
      notify("Cuenta creada", "success")
      fetchData()
    } catch (err) {
      notify("Error al crear cuenta", "error")
    }
  }

  async function deleteAccount(id) {
    if (!confirm("¿Eliminar esta cuenta?")) return
    try {
      await pb.collection('payment_accounts').delete(id)
      notify("Cuenta eliminada", "success")
      fetchData()
    } catch (err) {
      notify("Error al eliminar cuenta", "error")
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      const hasFile = comprobanteFile instanceof File
      const fd = hasFile ? new FormData() : {}
      const setField = (key, val) => hasFile ? fd.append(key, val) : (fd[key] = val)
      setField('user_id', formData.user_id)
      setField('user_service_id', formData.service_id || null)
      setField('amount', parseFloat(formData.amount))
      setField('payment_date', formData.payment_date || new Date().toISOString())
      setField('payment_account', formData.payment_account || null)
      setField('status', "paid")
      if (hasFile) fd.append('comprobante', comprobanteFile)
      if (editingPayment) {
        await pb.collection('payments').update(editingPayment.id, fd)
        notify("Pago actualizado correctamente", "success")
      } else {
        await pb.collection('payments').create(fd)
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
    setFormData({ user_id: "", service_id: "", amount: "", payment_date: "", payment_account: "" })
    setComprobanteFile(null)
    setComprobantePreview(null)
  }

  function handleEdit(payment) {
    setEditingPayment(payment)
    setFormData({
      user_id: payment.user_id,
      service_id: payment.user_service_id || "",
      amount: payment.amount || "",
      payment_date: payment.payment_date ? payment.payment_date.split("T")[0].split(" ")[0] : "",
      payment_account: typeof payment.payment_account === 'object' ? payment.payment_account?.id : (payment.payment_account || ""),
    })
    setComprobanteFile(null)
    setComprobantePreview(payment.comprobante ? pb.files.getUrl(payment, 'comprobante') : null)
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

  const filteredPayments = payments.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus
    const matchMonth = !filterMonth || p.payment_date?.startsWith(filterMonth)
    const matchSearch = !searchClient || p.expand?.user_id?.name?.toLowerCase().includes(searchClient.toLowerCase())
    const matchAccount = !filterAccount || (
      typeof p.payment_account === 'object' ? p.payment_account?.id === filterAccount : p.payment_account === filterAccount
    )
    return matchStatus && matchMonth && matchSearch && matchAccount
  })

  const getServicesForUser = (userId) => userServices.filter((s) => s.user_id === userId)

  const totalPaid = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const totalPending = filteredPayments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const accountTotals = paymentAccounts.map((acc) => {
    const paidSum = payments
      .filter((p) => {
        const accId = typeof p.payment_account === 'object' ? p.payment_account?.id : p.payment_account
        return accId === acc.id && p.status === "paid"
      })
      .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
    return { ...acc, total: paidSum }
  })

  const monthLabel = filterMonth
    ? new Date(filterMonth + "-01").toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    : "Todos"

  function exportCSV() {
    const headers = ["Cliente", "Servicio", "Monto", "Fecha", "Cuenta", "Estado"]
    const escapeCsv = (v) => {
      if (v === null || v === undefined) return '""'
      const s = String(v)
      return `"${s.replace(/"/g, '""')}"`
    }
    const accName = (p) => {
      if (typeof p.payment_account === 'object') return p.payment_account?.name || ""
      return p.expand?.payment_account?.name || p.payment_account || ""
    }
    const rows = filteredPayments.map((p) => [
      p.expand?.user_id?.name || "-",
      p.expand?.user_service_id?.name || p.expand?.user_service_id?.expand?.service_id?.name || "-",
      formatCurrency(p.amount),
      formatDate(p.payment_date),
      accName(p),
      p.status,
    ])
    const csv = [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `pagos_${filterMonth || new Date().toISOString().split("T")[0]}.csv`
    a.click()
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
            <p className="text-sm text-muted-foreground">{filteredPayments.length} pagos en {monthLabel}</p>
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
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pendiente</p>
          <p className="text-3xl font-bold text-orange-500">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pagados</p>
          <p className="text-3xl font-bold text-foreground">{filteredPayments.filter(p => p.status === "paid").length}</p>
        </Card>
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Pagos</TabsTrigger>
          <TabsTrigger value="accounts">Cuentas</TabsTrigger>
        </TabsList>

        <TabsContent value="payments" className="space-y-4 mt-4">
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
                <label className="text-sm text-muted-foreground">Mes:</label>
                <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm" />
              </div>
              <select value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Todas las cuentas</option>
                {paymentAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
              </select>
              {(filterStatus !== "all" || filterAccount) && (
                <button onClick={() => { setFilterStatus("all"); setFilterAccount("") }} className="text-sm text-muted-foreground hover:text-foreground">Limpiar filtros</button>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Servicio</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Monto</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Fecha</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Cuenta</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Comp.</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Estado</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPayments.length === 0 ? (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">No hay pagos registrados.</td></tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const accName = typeof payment.payment_account === 'object'
                        ? payment.payment_account?.name
                        : payment.expand?.payment_account?.name || ""
                      return (
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
                          <td className="px-6 py-4">
                            {accName ? (
                              <span className="text-xs font-medium text-foreground">{accName}</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {payment.comprobante ? (
                              <a href={pb.files.getUrl(payment, 'comprobante')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                <Image className="w-4 h-4" />
                                Ver
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
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
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="space-y-4 mt-4">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <Input
                placeholder="Nombre de la cuenta (ej. Bancolombia, Nequi)"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={createAccount}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {paymentAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay cuentas registradas</p>
              ) : (
                paymentAccounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Landmark className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Total cobrado: {formatCurrency(accountTotals.find((a) => a.id === acc.id)?.total || 0)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteAccount(acc.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/20 bg-primary/5">
                <p className="font-bold text-foreground">Total cobrado general</p>
                <p className="font-bold text-xl text-primary">
                  {formatCurrency(
                    paymentAccounts.reduce((s, a) => {
                      const found = accountTotals.find((at) => at.id === a.id)
                      return s + (found?.total || 0)
                    }, 0)
                  )}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

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
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Fecha del abono</label>
              <input type="date" value={formData.payment_date} onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Cuenta</label>
            <select value={formData.payment_account} onChange={(e) => setFormData({ ...formData, payment_account: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Sin cuenta</option>
              {paymentAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Comprobante (opcional)</label>
            <div
              onPaste={(e) => {
                const items = e.clipboardData?.items
                for (const item of items) {
                  if (item.type.startsWith('image/')) {
                    const file = item.getAsFile()
                    setComprobanteFile(file)
                    setComprobantePreview(URL.createObjectURL(file))
                    return
                  }
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center h-24 rounded-md border-2 border-dashed border-input bg-background cursor-pointer hover:border-primary/50 transition-colors text-muted-foreground text-sm"
            >
              {comprobantePreview ? (
                <div className="relative w-full h-full group">
                  <img src={comprobantePreview} alt="Comprobante" className="w-full h-full object-contain rounded-md" />
                  <button type="button" onClick={(e) => { e.stopPropagation(); setComprobanteFile(null); setComprobantePreview(null) }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Image className="w-5 h-5" />
                  <span>Click para seleccionar o Ctrl+V para pegar</span>
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) {
                setComprobanteFile(file)
                setComprobantePreview(URL.createObjectURL(file))
              }
            }} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editingPayment ? "Guardar Cambios" : "Registrar Pago"}</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}