import { useState, useEffect, useRef, useMemo, Fragment } from "react"
import pb from "@/lib/pocketbaseClient"
import { normalizeWhatsapp } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { formatDate } from "@/utils/dateUtils"
import { syncOneTimeAbono, getComprobantes, addComprobante, deleteComprobante } from "@/utils/paymentUtils"
import { formatCurrency } from "@/utils/formatUtils"
import Modal from "@/components/Modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, Download, Plus, Search, Edit3, Trash2, MessageCircle, Loader2, Landmark, Image, X, ChevronDown, ChevronRight } from "lucide-react"

export default function AdminPayments() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [userServices, setUserServices] = useState([])
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterMonth, setFilterMonth] = useState("")
  const [filterAccount, setFilterAccount] = useState("")
  const [searchClient, setSearchClient] = useState("")
  const [newAccountName, setNewAccountName] = useState("")
  const [formData, setFormData] = useState({
    user_id: "", service_id: "", amount: "", payment_date: "", payment_account: "",
  })
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [comprobantePreview, setComprobantePreview] = useState(null)
  const [comprobantes, setComprobantes] = useState([])
  const [uploadingComprobanteId, setUploadingComprobanteId] = useState(null)
  const fileInputRef = useRef(null)

  const backfillDone = useRef(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    try {
      const [paymentsData, usersData, userServicesData, accountsData, compData] = await Promise.all([
        pb.collection('payments').getFullList({ sort: '-payment_date', expand: 'user_service_id,user_id,payment_account,user_service_id.service_id', requestKey: null }),
        pb.collection('users').getFullList({ filter: 'role = "user"', requestKey: null }),
        pb.collection('user_services').getFullList({ sort: '-created', expand: 'service_id', requestKey: null }),
        pb.collection('payment_accounts').getFullList({ sort: 'name', requestKey: null }),
        pb.collection('comprobantes').getFullList({ sort: 'created', requestKey: null }),
      ])
      setPayments(paymentsData || [])
      setUsers(usersData || [])
      setUserServices(userServicesData || [])
      setPaymentAccounts(accountsData || [])
      setComprobantes(compData || [])

      if (!backfillDone.current) {
        backfillDone.current = true
        const svcWithPmts = new Set((paymentsData || []).filter(p => p.user_service_id).map(p => p.user_service_id))
        const newPayments = [...(paymentsData || [])]
        let created = 0
        for (const us of (userServicesData || [])) {
          if ((us.price || 0) <= 0) continue
          if (us.owner === 1) continue
          if (svcWithPmts.has(us.id)) continue
          const pendingAmount = us.requiere_abono && us.monto_abonado
            ? (us.price || 0) - parseFloat(us.monto_abonado)
            : (us.price || 0)
          if (pendingAmount > 0) {
            try {
              const newPmt = await pb.collection('payments').create({
                user_service_id: us.id,
                user_id: us.user_id,
                amount: pendingAmount,
                payment_date: us.start_date || new Date().toISOString(),
                status: "pending",
              })
              newPayments.push(newPmt)
              created++
            } catch (e) { console.error("Error creando pendiente para", us.id, e) }
          }
        }
        if (created > 0) setPayments(newPayments)
      }
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
      const payload = {
        user_id: formData.user_id,
        user_service_id: formData.service_id || null,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date || new Date().toISOString(),
        payment_account: formData.payment_account || null,
        status: "paid",
      }
      let saved
      if (editingPayment) {
        saved = await pb.collection('payments').update(editingPayment.id, payload)
      } else {
        saved = await pb.collection('payments').create(payload)
      }
      if (comprobanteFile instanceof File) {
        const fd = new FormData()
        fd.append('comprobante', comprobanteFile)
        saved = await pb.collection('payments').update(saved.id, fd)
      }
      notify(editingPayment ? "Pago actualizado correctamente" : "Pago registrado correctamente", "success")
      await syncOneTimeAbono(saved.user_service_id)
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
    setComprobantePreview(payment.comprobante ? pb.files.getURL(payment, 'comprobante') : null)
    setShowModal(true)
  }

  async function handleDelete(payment) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return
    try {
      const userServiceId = payment.user_service_id
      await pb.collection('payments').delete(payment.id)
      await syncOneTimeAbono(userServiceId)
      fetchData()
      notify("Pago eliminado correctamente", "success")
    } catch (error) {
      console.error("Error eliminando pago:", error)
      notify("Error al eliminar pago", "error")
    }
  }

  async function updateStatus(payment, newStatus) {
    try {
      const updated = await pb.collection('payments').update(payment.id, { status: newStatus })
      await syncOneTimeAbono(updated.user_service_id)
      fetchData()
    } catch (error) {
      console.error("Error actualizando estado:", error)
    }
  }

  async function handleUploadComprobante(paymentId, userId, files) {
    if (!files || files.length === 0) return
    setUploadingComprobanteId(paymentId)
    try {
      for (const file of files) {
        await addComprobante(paymentId, userId, file)
      }
      fetchData()
    } catch (err) {
      console.error("Error subiendo comprobante:", err)
    }
    setUploadingComprobanteId(null)
  }

  async function handleDeleteComprobante(id) {
    if (!confirm("¿Eliminar este comprobante?")) return
    await deleteComprobante(id)
    fetchData()
  }

  const ownerMap = useMemo(() => {
    const map = {}
    userServices.forEach(us => { map[us.id] = us.owner })
    return map
  }, [userServices])

  const serviceMap = useMemo(() => {
    const map = {}
    userServices.forEach(us => {
      map[us.id] = {
        price: parseFloat(us.price) || 0,
        monto_abonado: parseFloat(us.monto_abonado) || 0,
        owner: us.owner,
        name: us.name || us.expand?.service_id?.name || '',
        url_dominio: us.url_dominio || '',
      }
    })
    return map
  }, [userServices])

  const [expandedId, setExpandedId] = useState(null)

  const filteredPayments = payments.filter((p) => {
    if (p.user_service_id && ownerMap[p.user_service_id] === 1) return false
    const isPending = p.status === "pending"
    const svc = p.user_service_id ? serviceMap[p.user_service_id] : null
    const isPartial = isPending && svc && svc.monto_abonado > 0
    let matchStatus = false
    if (filterStatus === "all") matchStatus = true
    else if (filterStatus === "parcial") matchStatus = isPartial
    else if (filterStatus === "pending") matchStatus = isPending && !isPartial
    else matchStatus = p.status === filterStatus
    const matchMonth = !filterMonth || p.payment_date?.startsWith(filterMonth)
    const matchSearch = !searchClient || p.expand?.user_id?.name?.toLowerCase().includes(searchClient.toLowerCase())
    const matchAccount = !filterAccount || (
      typeof p.payment_account === 'object' ? p.payment_account?.id === filterAccount : p.payment_account === filterAccount
    )
    const tooFarFuture = isPending && p.payment_date && (new Date(p.payment_date) - new Date()) > 30 * 24 * 60 * 60 * 1000
    return matchStatus && matchMonth && matchSearch && matchAccount && !tooFarFuture
  })

  const getServicesForUser = (userId) => userServices.filter((s) => s.user_id === userId)

  const groupedByClient = useMemo(() => {
    const groups = {}
    filteredPayments.forEach(p => {
      const uid = p.user_id
      if (!uid) return
      if (!groups[uid]) {
        groups[uid] = {
          userId: uid,
          userName: p.expand?.user_id?.name || '—',
          whatsapp: p.expand?.user_id?.whatsapp || '',
          payments: [],
        }
      }
      groups[uid].payments.push(p)
    })
    return Object.values(groups).sort((a, b) => a.userName.localeCompare(b.userName))
  }, [filteredPayments])

  const comprobantesMap = useMemo(() => {
    const map = {}
    comprobantes.forEach(c => {
      if (!map[c.payment_id]) map[c.payment_id] = []
      map[c.payment_id].push(c)
    })
    return map
  }, [comprobantes])

  const totalPaid = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const totalPending = filteredPayments
    .filter((p) => {
      if (p.status !== "pending") return false
      const svc = p.user_service_id ? serviceMap[p.user_service_id] : null
      return !(svc && svc.monto_abonado > 0)
    })
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)

  const totalPartial = filteredPayments
    .filter((p) => {
      if (p.status !== "pending") return false
      const svc = p.user_service_id ? serviceMap[p.user_service_id] : null
      return svc && svc.monto_abonado > 0
    })
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
            <p className="text-sm text-muted-foreground">{groupedByClient.length} clientes en {monthLabel}</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">{monthLabel}</p>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Pendiente</p>
          <p className="text-3xl font-bold text-orange-500">{formatCurrency(totalPending)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Parcial</p>
          <p className="text-3xl font-bold text-blue-500">{formatCurrency(totalPartial)}</p>
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
                <option value="pending">Pendiente</option>
                <option value="parcial">Parcial</option>
                <option value="paid">Pagado</option>
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
              {(filterStatus !== "all" || filterAccount || filterMonth) && (
                <button onClick={() => { setFilterStatus("all"); setFilterAccount(""); setFilterMonth("") }} className="text-sm text-muted-foreground hover:text-foreground">Limpiar filtros</button>
              )}
              {filterMonth && (
                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">
                  Mostrando solo {new Date(filterMonth + "-01").toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground"></th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Cliente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Servicios</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Total Pendiente</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Pagados</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {groupedByClient.length === 0 ? (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No hay pagos registrados.</td></tr>
                  ) : (
                    groupedByClient.map((group) => {
                      const isExpanded = expandedId === group.userId
                      const totalPendingAmount = group.payments
                        .filter(p => p.status === "pending")
                        .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
                      const paidCount = group.payments.filter(p => p.status === "paid").length
                      const pendingCount = group.payments.filter(p => p.status === "pending").length
                      const serviceNames = [...new Set(group.payments.map(p =>
                        p.expand?.user_service_id?.name || p.expand?.user_service_id?.expand?.service_id?.name || null
                      ).filter(Boolean))].slice(0, 3)
                      return (
                        <Fragment key={group.userId}>
                          <tr className="hover:bg-muted/50 transition-all cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : group.userId)}>
                            <td className="px-3 py-4">
                              <button className="text-muted-foreground hover:text-foreground">
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {group.whatsapp && (
                                  <a href={`https://wa.me/${normalizeWhatsapp(group.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-md bg-green-500/10 flex items-center justify-center hover:bg-green-500/20 transition-colors" onClick={e => e.stopPropagation()}>
                                    <MessageCircle className="w-4 h-4 text-green-500" />
                                  </a>
                                )}
                                <span className="font-semibold text-foreground">{group.userName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {serviceNames.length > 0
                                  ? serviceNames.map((n, i) => <span key={i} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{n}</span>)
                                  : <span className="text-xs text-muted-foreground">{group.payments.length} pago(s)</span>}
                                {group.payments.length > 3 && <span className="text-xs text-muted-foreground">+{group.payments.length - 3} más</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-orange-500">{formatCurrency(totalPendingAmount)}</span>
                              {pendingCount > 0 && <span className="text-xs text-muted-foreground ml-1">({pendingCount} pend.)</span>}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-medium text-green-500">{paidCount} pagado(s)</span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={5} className="px-6 py-0 bg-muted/10">
                                <div className="py-3 px-2">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-muted-foreground/20">
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Servicio</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Descripción</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Monto</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Cuenta</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Estado</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Comp.</th>
                                        <th className="px-4 py-2 text-left text-muted-foreground font-medium">Acción</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {group.payments.map(h => {
                                        const hSvcName = h.expand?.user_service_id?.name || h.expand?.user_service_id?.expand?.service_id?.name || "-"
                                        const hAccName = typeof h.payment_account === 'object'
                                          ? h.payment_account?.name
                                          : h.expand?.payment_account?.name || ""
                                        const hDesc = h.payment_date
                                          ? new Date(h.payment_date).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
                                          : "—"
                                        const svc = h.user_service_id ? serviceMap[h.user_service_id] : null
                                        const isPartial = h.status === "pending" && svc && svc.monto_abonado > 0
                                        return (
                                          <tr key={h.id} className="border-b border-muted-foreground/10 hover:bg-muted/20">
                                            <td className="px-4 py-2 text-muted-foreground">{hSvcName}</td>
                                            <td className="px-4 py-2">{hDesc}</td>
                                            <td className="px-4 py-2 font-semibold">
                                              {formatCurrency(h.amount)}
                                              {isPartial && <span className="block text-xs text-blue-500">Abonado {formatCurrency(svc.monto_abonado)} / {formatCurrency(svc.price)}</span>}
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{hAccName || "—"}</td>
                                            <td className="px-4 py-2">
                                              {isPartial ? (
                                                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/30">Parcial</span>
                                              ) : (
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${h.status === "paid" ? "bg-green-500/10 text-green-500" : h.status === "pending" ? "bg-orange-500/10 text-orange-500" : "bg-destructive/10 text-destructive"}`}>
                                                  {h.status === "paid" ? "Pagado" : h.status === "pending" ? "Pendiente" : "Fallido"}
                                                </span>
                                              )}
                                            </td>
                                              <td className="px-4 py-2">
                                                <div className="flex flex-wrap items-center gap-1">
                                                  {(comprobantesMap[h.id] || []).map(c => (
                                                    <span key={c.id} className="inline-flex items-center gap-0.5 group">
                                                      <a href={pb.files.getURL(c, 'file')} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                                        <Image className="w-3 h-3 inline" />
                                                      </a>
                                                      <button onClick={() => handleDeleteComprobante(c.id)} className="text-destructive/60 hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                  <button
                                                    onClick={() => document.getElementById(`comp-upload-${h.id}`)?.click()}
                                                    className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-input rounded px-1.5 py-0.5"
                                                    title="Agregar comprobante"
                                                  >
                                                    {uploadingComprobanteId === h.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "+"}
                                                  </button>
                                                  <input
                                                    id={`comp-upload-${h.id}`}
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    onChange={(e) => {
                                                      const files = Array.from(e.target.files || [])
                                                      if (files.length) handleUploadComprobante(h.id, h.user_id, files)
                                                      e.target.value = ''
                                                    }}
                                                  />
                                                </div>
                                              </td>
                                              <td className="px-4 py-2">
                                                {h.status !== "paid" && (
                                                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleEdit(h)}>Pagar</Button>
                                                )}
                                              </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
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