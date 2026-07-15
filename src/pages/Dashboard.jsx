import { useState, useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import pb from "@/lib/pocketbaseClient"
import { formatDate, getDaysRemaining } from "@/utils/dateUtils"
import {
  normalizeWhatsapp,
  formatWhatsapp,
  formatCurrency,
  normalizeUrl,
} from "@/utils/formatUtils"
import { getPaymentsByUserService } from "@/utils/paymentUtils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CredentialsModal from "@/components/CredentialsModal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import StatusBadge from "@/components/StatusBadge"

import {
  Package,
  Globe,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CreditCard,
  MessageCircle,
  Zap,
  User,
  ChevronLeft,
  Info,
  BarChart3,
  AlertCircle,
  Loader2,
  ExternalLink,
  Key,
  ArrowRight,
  Search,
  Users,
  DollarSign,
  Activity,
  ChevronRight,
  UserPlus,
  Wallet,
  LayoutDashboard,
} from "lucide-react"

function getServiceStatus(service) {
  if (service.billing_type === "one_time" && service.requiere_abono && (service.monto_abonado || 0) < (service.price || 0)) return "pending"
  const days = getDaysRemaining(service.expires_at)
  if (service.no_expiry === true) return "active"
  if (days === null) return "pending"
  if (days < 0) return "expired"
  if (days <= 5) return "warning"
  return "active"
}

function getPaymentStatus(expiresAt) {
  const days = getDaysRemaining(expiresAt)
  if (days === null) return { label: "Sin fecha", color: "secondary", urgency: 0 }
  if (days < 0) return { label: "Vencido", color: "destructive", urgency: 3 }
  if (days <= 20) return { label: "Por Vencer", color: "outline", urgency: 2 }
  return { label: "Al día", color: "default", urgency: 1 }
}

export default function Dashboard() {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [services, setServices] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState({ users: 0, services: 0, activeServices: 0, totalRevenue: 0 })
  const [upcomingRenewals, setUpcomingRenewals] = useState([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [allServices, setAllServices] = useState([])
  const [baseServices, setBaseServices] = useState([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterService, setFilterService] = useState("all")
  const [activeTab, setActiveTab] = useState("renewals")
  const [searchTerm, setSearchTerm] = useState("")
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [fetchError, setFetchError] = useState(null)
  const [credentialsService, setCredentialsService] = useState(null)

  const fetchData = useCallback(async () => {
    if (!user) return
    setFetchError(null)
    try {
      const servicesData = await pb.collection('user_services').getFullList({
        filter: `user_id = "${user.id}"`,
        sort: '-created',
        expand: 'service_id',
        requestKey: null,
      })
      setServices(servicesData ?? [])
      const ownerServices = (servicesData || []).filter((s) => s.owner === 1 || s.billing_type === "one_time")
      const results = await Promise.all(
        ownerServices.map((s) => getPaymentsByUserService(s.id)),
      )
      const allPayments = []
      results.forEach((result) => {
        if (result.success && result.data) {
          allPayments.push(...result.data)
        }
      })
      const pendingFromDb = allPayments.filter((p) => p.status === "pending")

      const oneTimeSvcs = (servicesData || []).filter((s) => s.billing_type === "one_time")
      const pendingFromOneTime = oneTimeSvcs
        .map((s) => {
          const price = parseFloat(s.price) || 0
          const svcPayments = allPayments.filter((p) => p.user_service_id === s.id && p.status === "paid")
          const totalPaid = svcPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          return { service: s, price, totalPaid }
        })
        .filter(({ price, totalPaid }) => totalPaid < price)
        .map(({ service: s, price, totalPaid }) => ({
          id: `one_time_pending_${s.id}`,
          amount: price - totalPaid,
          service_name: s.expand?.service_id?.name || s.name || "Servicio",
          payment_date: s.expires_at || s.start_date || new Date().toISOString(),
          status: "pending",
          billing_type: "one_time",
        }))

      setPendingPayments([...pendingFromDb, ...pendingFromOneTime])
    } catch (err) {
      console.error("Error al cargar datos:", err)
      setFetchError("No se pudo cargar la información. Intenta recargar.")
    } finally {
      setLoading(false)
    }
  }, [user])

  const fetchAdminData = useCallback(async () => {
    if (!user) return
    setAdminLoading(true)
    try {
      const [usersData, servicesData, userServicesData, paymentsData, allUsData, baseSvcsData] = await Promise.all([
        pb.collection('users').getFullList({ requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
        pb.collection('user_services').getFullList({ filter: 'status = "active"', requestKey: null }),
        pb.collection('payments').getFullList({ filter: 'status = "paid"', requestKey: null }),
        pb.collection('user_services').getFullList({ sort: 'expires_at', expand: 'service_id,user_id', requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
      ])
      const totalRevenue = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      setAdminStats({
        users: usersData.length,
        services: servicesData.length,
        activeServices: userServicesData.length,
        totalRevenue,
      })
      setAllServices(allUsData || [])
      setBaseServices(baseSvcsData || [])

      const now = new Date()
      const twentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)
      const renewals = await pb.collection('user_services').getFullList({
        filter: `expires_at != null && expires_at >= "${now.toISOString()}" && expires_at <= "${twentyDaysLater.toISOString()}"`,
        sort: 'expires_at',
        expand: 'service_id,user_id',
        requestKey: null,
      })
      setUpcomingRenewals(renewals || [])
    } catch (err) {
      console.error("Error al cargar datos del dashboard admin:", err)
    } finally {
      setAdminLoading(false)
    }
  }, [user])

  const fetchSettings = useCallback(async () => {
    try {
      const data = await pb.collection('settings').getFirstListItem('key = "whatsapp_support"', { requestKey: null })
      if (data) setWhatsappNumber(data.value)
    } catch (err) {
      console.error("Error al cargar configuración:", err)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      setLoading(false)
      fetchAdminData()
    } else {
      fetchData()
    }
  }, [isAdmin, fetchAdminData, fetchData])
  useEffect(() => { fetchSettings() }, [fetchSettings])

  function handleRenew(service) {
    const raw =
      service.url_dominio ||
      service.expand?.service_id?.url ||
      service.expand?.service_id?.name ||
      service.name ||
      ""
    let hostname = raw
    try {
      if (raw) hostname = new URL(normalizeUrl(raw)).hostname
    } catch (e) {
      hostname = raw
    }
    const message = encodeURIComponent(
      `Hola, quiero renovar el dominio: ${hostname}`,
    )
    const wa = normalizeWhatsapp(whatsappNumber || "3167195500")
    window.open(`https://wa.me/${wa}?text=${message}`, "_blank")
  }

  const serviceCounts = useMemo(
    () =>
      services.reduce(
        (acc, s) => {
          const status = getServiceStatus(s)
          acc[status] = (acc[status] ?? 0) + 1
          return acc
        },
        { active: 0, pending: 0, expired: 0, warning: 0 },
      ),
    [services],
  )

  const dominiosArray = useMemo(
    () => [...new Set(services.map((s) => s.url_dominio).filter(Boolean))],
    [services],
  )

  const filteredServicesList = useMemo(
    () => allServices.filter((item) => {
      if (filterService !== "all" && item.service_id !== filterService) return false
      if (filterStatus !== "all") {
        const status = getPaymentStatus(item.expires_at)
        if (filterStatus === "expired" && status.urgency !== 3) return false
        if (filterStatus === "expiring" && status.urgency !== 2) return false
        if (filterStatus === "active" && status.urgency !== 1) return false
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchesName = item.expand?.user_id?.name?.toLowerCase().includes(term)
        const matchesDomain = item.url_dominio?.toLowerCase().includes(term)
        const matchesService = item.expand?.service_id?.name?.toLowerCase().includes(term)
        if (!matchesName && !matchesDomain && !matchesService) return false
      }
      return true
    }),
    [allServices, filterService, filterStatus, searchTerm],
  )

  const supportWa = normalizeWhatsapp(whatsappNumber || "3167195500")

  if (profile?.status === "suspended") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6 border border-destructive/20">
            <AlertCircle className="w-10 h-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">Cuenta Suspendida</h1>
          <p className="text-muted-foreground mb-8">
            Tu cuenta ha sido suspendida. Contacta al administrador.
          </p>
          <a
            href={`https://wa.me/${supportWa}?text=${encodeURIComponent("Hola, mi cuenta aparece suspendida. Necesito ayuda.")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button className="gap-2">
              <MessageCircle className="w-4 h-4" />
              Contactar soporte
            </Button>
          </a>
        </div>
      </div>
    )
  }

  if (isAdmin) {
    if (adminLoading) {
      return (
        <div className="flex justify-center items-center h-64">
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
          <Button size="sm" asChild>
            <Link to="/admin/users">
              <UserPlus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Link>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <Link to="/admin/services">
              <Package className="w-4 h-4 mr-2" />
              Nuevo Servicio
            </Link>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/payments">
              <Wallet className="w-4 h-4 mr-2" />
              Registrar Pago
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{adminStats.users}</p>
            <p className="text-sm text-muted-foreground">Clientes</p>
          </Card>
          <Card className="p-5">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{adminStats.services}</p>
            <p className="text-sm text-muted-foreground">Servicios Base</p>
          </Card>
          <Card className="p-5">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{adminStats.activeServices}</p>
            <p className="text-sm text-muted-foreground">Servicios Activos</p>
          </Card>
          <Card className="p-5">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(adminStats.totalRevenue)}</p>
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
                    {baseServices.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
              )}
            </div>

            <TabsContent value="renewals" className="p-4">
              {upcomingRenewals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No hay renovaciones próximas</div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {(() => {
                    const grouped = {}
                    upcomingRenewals.forEach((item) => {
                      const clientId = item.expand?.user_id?.id || "unknown"
                      if (!grouped[clientId]) grouped[clientId] = { name: item.expand?.user_id?.name || "Sin nombre", items: [] }
                      grouped[clientId].items.push(item)
                    })
                    return Object.entries(grouped).map(([clientId, group]) => (
                      <div key={clientId} className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground px-1">{group.name}</h3>
                        {group.items.map((item) => {
                          const days = getDaysRemaining(item.expires_at)
                          const status = getPaymentStatus(item.expires_at)
                          const ownerLabel = item.owner === 1 ? "Cliente paga" : "Lo administro"
                          const ownerColor = item.owner === 1 ? "default" : "secondary"
                          const websiteName = (() => {
                            if (!item.url_dominio) return null
                            try { return new URL(normalizeUrl(item.url_dominio)).hostname }
                            catch (e) { return item.url_dominio }
                          })()
                          return (
                            <div key={item.id} className="group relative overflow-hidden rounded-lg border bg-card p-3 hover:border-primary/50 transition-all">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <Badge variant={status.color} className="text-[10px] px-1.5 py-0">{status.label}</Badge>
                                    <Badge variant={ownerColor} className="text-[10px] px-1.5 py-0">{ownerLabel}</Badge>
                                  </div>
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {websiteName ? (
                                      <a href={normalizeUrl(item.url_dominio)} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                                        {websiteName}
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                      </a>
                                    ) : item.expand?.service_id?.name || "Servicio"}
                                  </p>
                                  {websiteName && item.expand?.service_id?.name && (
                                    <p className="text-xs text-muted-foreground truncate">{item.expand.service_id.name}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button onClick={() => setCredentialsService(item)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-all">
                                    <Key className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => handleRenew(item)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-all">
                                    <Zap className="w-3 h-3" />
                                    Renovar
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between mt-2 pt-2 border-t gap-3">
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-bold text-primary">{formatCurrency(item.price || 0)}</span>
                                  <span className="text-[10px] text-muted-foreground">{item.billing_type === "annual" ? "anual" : item.billing_type === "one_time" ? "único" : "mensual"}</span>
                                </div>
                                {item.expires_at && days !== null && (
                                  <div className={`flex items-center justify-center w-10 h-10 rounded-md text-sm font-extrabold shrink-0 ${
                                    days >= 20 ? "bg-green-500/10 text-green-500 border border-green-500/20" :
                                    days >= 7 ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                                    days >= 0 ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                                    "bg-destructive/10 text-destructive border border-destructive/20"
                                  }`}>
                                    <span>{Math.abs(days)}</span>
                                    <span className="text-[8px] font-normal">d</span>
                                  </div>
                                )}
                              </div>
                              {item.expires_at && (
                                <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t text-xs text-muted-foreground">
                                  <Calendar className="w-3 h-3" />
                                  Vence: {formatDate(item.expires_at)}
                                  {days < 0 && <span className="text-destructive font-medium ml-1">vencido</span>}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))
                  })()}
                </div>
              )}
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
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-sm font-bold shrink-0 text-primary">
                                  {item.expand?.user_id?.name?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <span className="font-medium text-foreground truncate">{item.expand?.user_id?.name}</span>
                              </div>
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
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-destructive text-sm">{fetchError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Mis Servicios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Package className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No tienes servicios contratados</p>
              <p className="text-muted-foreground/60 text-sm mt-1">Contacta al administrador para agregar servicios</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {services.map((service) => {
                const status = getServiceStatus(service)
                const days = getDaysRemaining(service.expires_at)
                return (
                  <div
                    key={service.id}
                    className="group relative overflow-hidden rounded-lg border bg-card p-4 hover:border-border transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <StatusBadge status={status} />
                          {service.owner === 0 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                              Lo administro
                            </span>
                          )}
                          {service.owner === 1 && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
                              Cliente paga
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground truncate">
                          {service.expand?.service_id?.name}
                        </h3>
                        {service.expand?.service_id?.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {service.expand?.service_id?.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Precio</p>
                        <p className="text-sm font-bold text-primary">
                          {formatCurrency(service.price ?? 0)}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setCredentialsService(service)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium transition-all"
                        >
                          <Key className="w-3 h-3" />
                          Accesos
                        </button>
                        <button
                          onClick={() => handleRenew(service)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium transition-all"
                        >
                          <Zap className="w-3 h-3" />
                          Renovar
                        </button>
                      </div>
                    </div>

                    {service.billing_type === "one_time" && service.requiere_abono && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <span>Abonado: <span className="font-semibold text-foreground">{formatCurrency(service.monto_abonado || 0)}</span></span>
                          <span>de <span className="font-semibold text-foreground">{formatCurrency(service.price || 0)}</span></span>
                          {(service.monto_abonado || 0) < (service.price || 0) && (
                            <span className="text-destructive">- Restante: {formatCurrency((service.price || 0) - (service.monto_abonado || 0))}</span>
                          )}
                        </div>
                      </div>
                    )}
                    {service.expires_at && service.billing_type !== "one_time" && (
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {formatDate(service.expires_at)}
                        </div>
                        {days !== null && (
                          <span
                            className={`text-xs font-medium ${
                              days < 0
                                ? "text-destructive"
                                : days <= 5
                                  ? "text-orange-500"
                                  : "text-green-500"
                            }`}
                          >
                            {days < 0
                              ? `${Math.abs(days)} días vencido`
                              : `${days} días`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Dominios</p>
                {dominiosArray.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {dominiosArray.map((d, i) => (
                      <a
                        key={i}
                        href={normalizeUrl(String(d))}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-foreground truncate hover:underline"
                      >
                        {String(d).replace(/^https?:\/\//i, "")}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No registrado</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {formatWhatsapp(profile?.whatsapp) || "No registrado"}
                </p>
              </div>
              {profile?.whatsapp && (
                <a
                  href={`https://wa.me/${normalizeWhatsapp(profile.whatsapp)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </a>
              )}
            </div>

            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 border">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.email || "No registrado"}
                </p>
              </div>
              {profile?.email && (
                <a href={`mailto:${profile.email}`}>
                  <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                </a>
              )}
            </div>

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Estado de Cuenta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-6 rounded-lg bg-muted border border-border">
              <p className="text-sm text-muted-foreground mb-1">Servicios Activos</p>
              <p className="text-4xl font-bold text-primary">
                {serviceCounts.active + serviceCounts.warning}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                de {services.length} total
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 rounded-lg bg-orange-500/5 border border-orange-500/10">
                <p className="text-2xl font-bold text-orange-500">{serviceCounts.warning}</p>
                <p className="text-xs text-muted-foreground">Por vencer</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-destructive/5 border border-destructive/10">
                <p className="text-2xl font-bold text-destructive">{serviceCounts.expired}</p>
                <p className="text-xs text-muted-foreground">Vencidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Próximos Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingPayments.slice(0, 5).map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-orange-500/5 border border-orange-500/10"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.service_name} - {formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded bg-orange-500/10 text-orange-500 text-xs font-medium">
                    Pendiente
                  </span>
                </div>
              ))}
              {pendingPayments.length > 5 && (
                <p className="text-center text-sm text-muted-foreground">
                  + {pendingPayments.length - 5} pagos más
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CredentialsModal
        service={credentialsService}
        isOpen={!!credentialsService}
        onClose={() => setCredentialsService(null)}
      />
    </div>
  )
}
