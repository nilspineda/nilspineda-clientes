import { useState, useEffect, useMemo } from "react"
import pb from "@/lib/pocketbaseClient"
import { normalizeUrl, normalizeWhatsapp, formatCurrency } from "@/utils/formatUtils"
import { formatDate } from "@/utils/dateUtils"
import Modal from "@/components/Modal"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Users,
  Package,
  Activity,
  DollarSign,
  UserPlus,
  Plus,
  Wallet,
  Search,
  ChevronRight,
  MessageCircle,
  Loader2,
  ArrowUpRight,
} from "lucide-react"

function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null
  const today = new Date()
  const expires = new Date(expiresAt)
  return Math.ceil((expires - today) / (1000 * 60 * 60 * 24))
}

function getPaymentStatus(expiresAt) {
  const days = getDaysRemaining(expiresAt)
  if (days === null) return { label: "Sin fecha", color: "secondary", urgency: 0 }
  if (days < 0) return { label: "Vencido", color: "destructive", urgency: 3 }
  if (days <= 20) return { label: "Por Vencer", color: "outline", urgency: 2 }
  return { label: "Al día", color: "default", urgency: 1 }
}

export default function AdminIndex() {
  const [stats, setStats] = useState({ users: 0, services: 0, activeServices: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [showNewUser, setShowNewUser] = useState(false)
  const [showNewService, setShowNewService] = useState(false)
  const [showNewPayment, setShowNewPayment] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clientPayments, setClientPayments] = useState([])
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", whatsapp: "" })
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", owner: 0 })
  const [paymentForm, setPaymentForm] = useState({ user_id: "", service_id: "", amount: "", payment_date: "", payment_method: "transfer" })
  const [users, setUsers] = useState([])
  const [services, setServices] = useState([])
  const [upcomingRenewals, setUpcomingRenewals] = useState([])
  const [allServices, setAllServices] = useState([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterService, setFilterService] = useState("all")
  const [activeTab, setActiveTab] = useState("renewals")
  const [clientModalTab, setClientModalTab] = useState("details")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchStats()
    fetchDataForForms()
  }, [])

  async function fetchStats() {
    try {
      const [usersData, servicesData, userServicesData, paymentsData] = await Promise.all([
        pb.collection('users').getFullList({ requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
        pb.collection('user_services').getFullList({ filter: 'status = "active"', requestKey: null }),
        pb.collection('payments').getFullList({ filter: 'status = "paid"', requestKey: null }),
      ])
      const totalRevenue = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      setStats({
        users: usersData.length,
        services: servicesData.length,
        activeServices: userServicesData.length,
        totalRevenue,
      })

      const now = new Date()
      const twentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
      const renewals = await pb.collection('user_services').getFullList({
        filter: `expires_at != null && expires_at >= "${now.toISOString()}" && expires_at <= "${twentyDaysLater.toISOString()}"`,
        sort: 'expires_at',
        expand: 'service_id,user_id',
        requestKey: null,
      })
      setUpcomingRenewals(renewals || [])

      const all = await pb.collection('user_services').getFullList({
        sort: 'expires_at',
        expand: 'service_id,user_id',
        requestKey: null,
      })
      setAllServices(all || [])
    } catch (err) {
      console.error("Error fetching stats:", err)
    }
    setLoading(false)
  }

  async function openClientModal(client) {
    setSelectedClient(client)
    setShowClientModal(true)
    try {
      const data = await pb.collection('payments').getFullList({
        filter: `user_id = "${client.id}"`,
        sort: '-payment_date',
        expand: 'user_service_id',
        requestKey: null,
      })
      setClientPayments(data || [])
    } catch (err) {
      console.error("Error fetching client payments:", err)
    }
  }

  async function fetchDataForForms() {
    try {
      const [usersData, servicesData] = await Promise.all([
        pb.collection('users').getFullList({ requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
      ])
      setUsers(usersData || [])
      setServices(servicesData || [])
    } catch (err) {
      console.error("Error fetching form data:", err)
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault()
    try {
      await pb.collection('users').create({
        email: userForm.email,
        password: userForm.password,
        passwordConfirm: userForm.password,
        name: userForm.name,
        whatsapp: normalizeWhatsapp(userForm.whatsapp),
        plain_password: userForm.password,
        role: "user",
        status: "active",
      })
      setShowNewUser(false)
      setUserForm({ name: "", email: "", password: "", whatsapp: "" })
      fetchStats()
      fetchDataForForms()
    } catch (err) {
      console.error("Error creating user:", err)
    }
  }

  async function handleCreateService(e) {
    e.preventDefault()
    try {
      await pb.collection('services').create({
        name: serviceForm.name,
        price: serviceForm.price ? parseFloat(serviceForm.price) : null,
        type: "personalizado",
      })
      setShowNewService(false)
      setServiceForm({ name: "", price: "", owner: 0 })
      fetchStats()
      fetchDataForForms()
    } catch (err) {
      console.error("Error creating service:", err)
    }
  }

  async function handleCreatePayment(e) {
    e.preventDefault()
    try {
      await pb.collection('payments').create({
        user_id: paymentForm.user_id,
        user_service_id: paymentForm.service_id || null,
        amount: paymentForm.amount ? parseFloat(paymentForm.amount) : null,
        payment_date: paymentForm.payment_date || new Date().toISOString(),
        payment_method: paymentForm.payment_method,
        status: "paid",
      })
      setShowNewPayment(false)
      setPaymentForm({ user_id: "", service_id: "", amount: "", payment_date: "", payment_method: "transfer" })
      fetchStats()
    } catch (err) {
      console.error("Error creating payment:", err)
    }
  }

  const filteredServicesList = useMemo(
    () => allServices.filter((item) => {
      if (filterService !== "all" && item.service_id !== filterService) return false
      if (filterStatus !== "all") {
        const status = getPaymentStatus(item.expires_at)
        if (filterStatus === "expired" && status.urgency !== 3) return false
        if (filterStatus === "expiring" && status.urgency !== 2) return false
        if (filterStatus === "active" && status.urgency !== 1) return false
      }
      return true
    }),
    [allServices, filterService, filterStatus],
  )

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
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenido al panel de administración</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setShowNewUser(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setShowNewService(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowNewPayment(true)}>
          <Wallet className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.users}</p>
          <p className="text-sm text-muted-foreground">Clientes</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.services}</p>
          <p className="text-sm text-muted-foreground">Servicios Base</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.activeServices}</p>
          <p className="text-sm text-muted-foreground">Servicios Activos</p>
        </Card>
        <Card className="p-5">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-muted-foreground">Ingresos Totales</p>
        </Card>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b">
            <TabsList>
              <TabsTrigger value="renewals">Renovaciones Próximas</TabsTrigger>
              <TabsTrigger value="all">Todos los Servicios</TabsTrigger>
            </TabsList>
            {activeTab === "all" && (
              <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-9 w-full sm:w-40"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Todos los estados</option>
                  <option value="active">Al día</option>
                  <option value="expiring">Por Vencer</option>
                  <option value="expired">Vencidos</option>
                </select>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="all">Cualquier Servicio</option>
                  {services.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            )}
          </div>

          <TabsContent value="renewals" className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Dominio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Días</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {upcomingRenewals.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No hay renovaciones próximas</td></tr>
                  ) : (
                    upcomingRenewals.map((item) => {
                      const days = getDaysRemaining(item.expires_at)
                      const status = getPaymentStatus(item.expires_at)
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => openClientModal(item.expand?.user_id)} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
                                {item.expand?.user_id?.name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <span className="font-medium text-foreground truncate">{item.expand?.user_id?.name}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs">{item.url_dominio || "-"}</span></td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{item.expand?.service_id?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{item.expires_at ? formatDate(item.expires_at) : "-"}</td>
                          <td className="px-4 py-3">
                            <span className={`font-medium text-sm ${days < 0 ? "text-destructive" : days <= 20 ? "text-orange-500" : "text-green-500"}`}>
                              {days !== null ? (days < 0 ? `${Math.abs(days)} días vencido` : `${days} días`) : "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3"><Badge variant={status.color}>{status.label}</Badge></td>
                          <td className="px-4 py-3 font-bold text-primary text-sm">{formatCurrency(item.price || 0)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="all" className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Dominio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Servicio</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Vencimiento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Días</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Precio</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredServicesList.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No hay datos para mostrar</td></tr>
                  ) : (
                    filteredServicesList.map((item) => {
                      const days = getDaysRemaining(item.expires_at)
                      const status = getPaymentStatus(item.expires_at)
                      return (
                        <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-3">
                            <button onClick={() => openClientModal(item.expand?.user_id)} className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left">
                              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
                                {item.expand?.user_id?.name?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <span className="font-medium text-foreground truncate">{item.expand?.user_id?.name}</span>
                            </button>
                          </td>
                          <td className="px-4 py-3"><span className="px-2 py-1 rounded bg-blue-500/10 text-blue-500 text-xs">{item.url_dominio || "-"}</span></td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{item.expand?.service_id?.name || "-"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{item.expires_at ? formatDate(item.expires_at) : "-"}</td>
                          <td className="px-4 py-3"><span className={`font-medium text-sm ${days < 0 ? "text-destructive" : days <= 20 ? "text-orange-500" : "text-green-500"}`}>{days !== null ? (days < 0 ? `${Math.abs(days)} días vencido` : `${days} días`) : "-"}</span></td>
                          <td className="px-4 py-3"><Badge variant={status.color}>{status.label}</Badge></td>
                          <td className="px-4 py-3 font-bold text-primary text-sm">{formatCurrency(item.price || 0)}</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </Card>

      <Modal isOpen={showClientModal} onClose={() => setShowClientModal(false)} title="Detalles del Cliente" size="lg">
        {selectedClient && (
          <div className="space-y-4">
            <Tabs value={clientModalTab} onValueChange={setClientModalTab}>
              <TabsList>
                <TabsTrigger value="details">Información</TabsTrigger>
                <TabsTrigger value="services">Sus Servicios</TabsTrigger>
                <TabsTrigger value="payments">Pagos</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Nombre</p>
                    <p className="font-semibold text-foreground">{selectedClient.name || "-"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Email</p>
                    <p className="font-semibold text-foreground truncate">{selectedClient.email || "-"}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/50 border">
                    <p className="text-sm font-medium text-muted-foreground mb-1">WhatsApp</p>
                    {selectedClient.whatsapp ? (
                      <a href={`https://wa.me/${selectedClient.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-md text-sm font-medium transition-all">
                        <MessageCircle className="w-4 h-4" />
                        {selectedClient.whatsapp}
                      </a>
                    ) : <p className="text-muted-foreground">-</p>}
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="services" className="pt-4">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {allServices.filter((s) => s.user_id === selectedClient.id).length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground text-sm">Este cliente no tiene servicios asignados.</p>
                  ) : (
                    allServices.filter((s) => s.user_id === selectedClient.id).map((service) => {
                      const status = getPaymentStatus(service.expires_at)
                      return (
                        <div key={service.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                          <div>
                            <p className="font-medium text-foreground">{service.expand?.service_id?.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{service.url_dominio || "Sin dominio"}</p>
                          </div>
                          <div className="text-right">
                            <Badge variant={status.color} className="mb-1">{status.label}</Badge>
                            <p className="text-xs font-semibold text-foreground">Vence: {service.expires_at ? formatDate(service.expires_at) : "-"}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </TabsContent>
              <TabsContent value="payments" className="pt-4">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {clientPayments.length === 0 ? (
                    <p className="text-center py-4 text-muted-foreground text-sm">Este cliente no tiene pagos registrados.</p>
                  ) : (
                    clientPayments.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                          <p className="font-medium text-foreground">{payment.expand?.user_service_id?.name || "Pago"}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{formatDate(payment.payment_date)}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>{payment.status === "paid" ? "Pagado" : "Pendiente"}</Badge>
                          <p className="text-xs font-semibold text-foreground mt-1">{formatCurrency(payment.amount || 0)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
            <div className="pt-4 flex justify-end">
              <Button variant="outline" onClick={() => setShowClientModal(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showNewUser} onClose={() => setShowNewUser(false)} title="Nuevo Cliente" size="md">
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre</label>
              <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
              <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contraseña</label>
              <input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">WhatsApp</label>
              <input type="text" value={userForm.whatsapp} onChange={(e) => setUserForm({ ...userForm, whatsapp: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear Cliente</Button>
            <Button type="button" variant="outline" onClick={() => setShowNewUser(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewService} onClose={() => setShowNewService(false)} title="Nuevo Servicio" size="md">
        <form onSubmit={handleCreateService} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre</label>
            <input type="text" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Precio de referencia</label>
            <input type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} placeholder="Opcional" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Crear Servicio</Button>
            <Button type="button" variant="outline" onClick={() => setShowNewService(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showNewPayment} onClose={() => setShowNewPayment(false)} title="Registrar Pago" size="md">
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Cliente</label>
            <select value={paymentForm.user_id} onChange={(e) => setPaymentForm({ ...paymentForm, user_id: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar cliente</option>
              {users.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Servicio</label>
            <select value={paymentForm.service_id} onChange={(e) => setPaymentForm({ ...paymentForm, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">Seleccionar servicio</option>
              {allServices.filter((us) => us.user_id === paymentForm.user_id).map((us) => (<option key={us.id} value={us.id}>{us.expand?.service_id?.name || us.name || "Servicio"}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Monto</label>
              <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Fecha</label>
              <input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">Registrar Pago</Button>
            <Button type="button" variant="outline" onClick={() => setShowNewPayment(false)} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
