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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import StatusBadge from "@/components/StatusBadge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Package,
  Globe,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  CreditCard,
  HeadphonesIcon,
  MessageCircle,
  Zap,
  User,
  Edit3,
  ChevronLeft,
  ArrowUpRight,
  Info,
  BarChart3,
  AlertCircle,
  Loader2,
  ExternalLink,
  Key,
  ArrowRight,
  Users,
  DollarSign,
  Activity,
  ChevronRight,
  UserPlus,
  Wallet,
  LayoutDashboard,
} from "lucide-react"

function getServiceStatus(service) {
  const days = getDaysRemaining(service.expires_at)
  if (service.no_expiry === true) return "active"
  if (days === null) return "pending"
  if (days < 0) return "expired"
  if (days <= 5) return "warning"
  return "active"
}

export default function Dashboard() {
  const { user, profile, refreshProfile, isAdmin } = useAuth()
  const [services, setServices] = useState([])
  const [pendingPayments, setPendingPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [adminStats, setAdminStats] = useState({ users: 0, services: 0, activeServices: 0, totalRevenue: 0 })
  const [upcomingRenewals, setUpcomingRenewals] = useState([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [whatsappNumber, setWhatsappNumber] = useState("")
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ whatsapp: "", email: "" })
  const [savingProfile, setSavingProfile] = useState(false)
  const [fetchError, setFetchError] = useState(null)

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
      const ownerServices = (servicesData || []).filter((s) => s.owner === 1)
      const results = await Promise.all(
        ownerServices.map((s) => getPaymentsByUserService(s.id)),
      )
      const allPayments = []
      results.forEach((result) => {
        if (result.success && result.data) {
          allPayments.push(...result.data)
        }
      })
      setPendingPayments(allPayments.filter((p) => p.status === "pending"))
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
      const [usersData, servicesData, userServicesData, paymentsData] = await Promise.all([
        pb.collection('users').getFullList({ requestKey: null }),
        pb.collection('services').getFullList({ requestKey: null }),
        pb.collection('user_services').getFullList({ filter: 'status = "active"', requestKey: null }),
        pb.collection('payments').getFullList({ filter: 'status = "paid"', requestKey: null }),
      ])
      const totalRevenue = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
      setAdminStats({
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
    } catch (err) {
      console.error("Error al cargar datos del dashboard admin:", err)
    } finally {
      setAdminLoading(false)
    }
  }, [user])

  const fetchSettings = useCallback(async () => {
    try {
      const data = await pb.collection('settings').getFirstListItem('key = "whatsapp_support"')
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

  useEffect(() => {
    if (profile) {
      setEditForm({
        whatsapp: profile.whatsapp ?? "",
        email: profile.email ?? "",
      })
    }
  }, [profile])

  async function handleUpdateProfile(e) {
    e.preventDefault()
    if (!editForm.email && !editForm.whatsapp) return
    setSavingProfile(true)
    try {
      await pb.collection('users').update(user.id, {
        whatsapp: normalizeWhatsapp(editForm.whatsapp),
        email: editForm.email.trim(),
      })
      setShowEditModal(false)
      await Promise.all([fetchData(), refreshProfile?.()])
    } catch (err) {
      console.error("Error al actualizar perfil:", err)
    } finally {
      setSavingProfile(false)
    }
  }

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
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Bienvenido al panel de control</p>
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
          <Button size="sm" variant="ghost" asChild>
            <Link to="/admin">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Panel Admin
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Renovaciones Próximas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingRenewals.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  No hay renovaciones en los próximos 20 días
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingRenewals.slice(0, 5).map((item) => {
                    const days = getDaysRemaining(item.expires_at)
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-bold shrink-0 text-primary">
                              {item.expand?.user_id?.name?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {item.expand?.user_id?.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.expand?.service_id?.name || "Servicio"}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-xs text-muted-foreground">
                            {item.expires_at ? formatDate(item.expires_at) : "-"}
                          </p>
                          <p className={`text-xs font-medium ${
                            days < 0 ? "text-destructive" : days <= 5 ? "text-orange-500" : "text-green-500"
                          }`}>
                            {days !== null
                              ? (days < 0 ? `${Math.abs(days)} días vencido` : `${days} días`)
                              : "-"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <Link
                    to="/admin"
                    className="flex items-center justify-center gap-1 text-sm text-primary hover:text-primary/80 font-medium pt-2"
                  >
                    Ver todas las renovaciones
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HeadphonesIcon className="w-5 h-5 text-primary" />
                  Soporte
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <a
                  href={`https://wa.me/${supportWa}?text=${encodeURIComponent("Hola, necesito soporte técnico")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-3 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-green-500/70 font-medium">WhatsApp</p>
                    <p className="text-sm font-semibold text-foreground">Soporte técnico</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-green-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>

                <a
                  href="mailto:info@nilspineda.com?subject=Soporte técnico"
                  className="flex items-center gap-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-500/70 font-medium">Email</p>
                    <p className="text-sm font-semibold text-foreground">info@nilspineda.com</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              </CardContent>
            </Card>

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-all w-full text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-primary/70 font-medium">Acciones</p>
                <p className="text-sm font-semibold text-primary">Editar perfil</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary/50" />
            </button>
          </div>
        </div>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Perfil</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                <Input
                  id="edit-whatsapp"
                  type="text"
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="3012345678"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={savingProfile || (!editForm.email && !editForm.whatsapp)}
                  className="flex-1"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left column */}
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
                          <Link
                            to={`/service/${service.id}/credentials`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium transition-all"
                          >
                            <Key className="w-3 h-3" />
                            Accesos
                          </Link>
                          <button
                            onClick={() => handleRenew(service)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium transition-all"
                          >
                            <Zap className="w-3 h-3" />
                            Renovar
                          </button>
                        </div>
                      </div>

                      {service.expires_at && (
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
      </div>

      {/* Right column */}
      <div className="space-y-6">
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

            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-all w-full text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-primary/70 font-medium">Acciones</p>
                <p className="text-sm font-semibold text-primary">Editar perfil</p>
              </div>
              <ArrowRight className="w-4 h-4 text-primary/50" />
            </button>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HeadphonesIcon className="w-5 h-5 text-primary" />
              Soporte
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href={`https://wa.me/${supportWa}?text=${encodeURIComponent("Hola, necesito soporte técnico")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-3 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-500/70 font-medium">WhatsApp</p>
                <p className="text-sm font-semibold text-foreground">Soporte técnico</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-green-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            <a
              href="mailto:info@nilspineda.com?subject=Soporte técnico"
              className="flex items-center gap-4 p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-blue-500/70 font-medium">Email</p>
                <p className="text-sm font-semibold text-foreground">info@nilspineda.com</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                type="text"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                placeholder="3012345678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="cliente@ejemplo.com"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingProfile || (!editForm.email && !editForm.whatsapp)}
                className="flex-1"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
