import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import pb from "@/lib/pocketbaseClient"
import { useAuth } from "@/hooks/useAuth"
import { normalizeWhatsapp, formatWhatsapp, normalizeUrl, formatCurrency } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { formatDate } from "@/utils/dateUtils"
import Modal from "@/components/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { getPaymentsByUserService, updatePaymentStatus } from "@/utils/paymentUtils"
import {
  Users, UserPlus, Mail, Phone, MessageCircle, ChevronLeft, Edit3, Trash2, Plus,
  Eye, EyeOff, Loader2, ExternalLink, Key, Calendar, DollarSign, CreditCard,
  User, Package, Info, Activity, ToggleLeft, ToggleRight, ArrowUpRight, Lock,
} from "lucide-react"

export default function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({ name: "", whatsapp: "", email: "", password: "" })
  const [showSendCreds, setShowSendCreds] = useState(false)
  const [newUserWhatsapp, setNewUserWhatsapp] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [userServices, setUserServices] = useState([])
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [serviceForm, setServiceForm] = useState({
    service_id: "", price: "", owner: 0, expires_at: "", next_billing_date: "",
    url_dominio: "", notes: "", billing_type: "monthly", no_expiry: false,
  })
  const [baseServices, setBaseServices] = useState([])
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [servicePayments, setServicePayments] = useState([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [selectedService, setSelectedService] = useState(null)
  const [showUserPaymentsModal, setShowUserPaymentsModal] = useState(false)
  const [paymentsForUser, setPaymentsForUser] = useState([])
  const [loadingUserPayments, setLoadingUserPayments] = useState(false)
  const [userServicesForPayments, setUserServicesForPayments] = useState([])
  const [paymentsUser, setPaymentsUser] = useState(null)
  const [paymentForm, setPaymentForm] = useState({ service_id: "", amount: "", payment_date: "", payment_method: "transferencia" })
  const [registeringPayment, setRegisteringPayment] = useState(false)
  const { isAdmin } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordUser, setPasswordUser] = useState(null)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const usersData = await pb.collection('users').getFullList()
      const userServicesData = await pb.collection('user_services').getFullList()

      const usersWithCount = (usersData || []).map((u) => ({
        ...u,
        user_services: userServicesData.filter((us) => us.user_id === u.id),
        service_count: userServicesData.filter((us) => us.user_id === u.id).length,
      }))

      const usersWithRenewal = usersWithCount.map((u) => {
        const daysList = u.user_services
          .map((s) => getDaysRemaining(s.expires_at))
          .filter((d) => d !== null && typeof d === "number")
        const minDays = daysList.length > 0 ? Math.min(...daysList) : null
        return { ...u, min_days_to_renewal: minDays }
      })

      usersWithRenewal.sort((a, b) => {
        if (a.min_days_to_renewal === null && b.min_days_to_renewal === null) return 0
        if (a.min_days_to_renewal === null) return 1
        if (b.min_days_to_renewal === null) return -1
        return a.min_days_to_renewal - b.min_days_to_renewal
      })

      setUsers(usersWithRenewal)
    } catch (err) {
      console.error("Error cargando usuarios:", err)
      notify("Error al cargar usuarios: " + (err?.message || err), "error")
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchBaseServices() {
    try {
      const data = await pb.collection('services').getFullList({ sort: 'name' })
      setBaseServices(data || [])
    } catch (err) {
      console.error("Error cargando servicios base:", err)
      setBaseServices([])
    }
  }

  async function viewUserDetails(user) {
    setSelectedUser(user)
    try {
      const data = await pb.collection('user_services').getFullList({
        filter: `user_id = "${user.id}"`,
        sort: '-created',
        expand: 'service_id',
      })
      const servicesWithDays = (data || [])
        .map((s) => ({ ...s, daysRemaining: getDaysRemaining(s.expires_at) }))
        .sort((a, b) => {
          const da = a.daysRemaining, db = b.daysRemaining
          if (da === null && db === null) return 0
          if (da === null) return 1
          if (db === null) return -1
          return da - db
        })
      setUserServices(servicesWithDays)
    } catch (err) {
      console.error("Error cargando servicios del usuario:", err)
      setUserServices([])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingUser) {
        await pb.collection('users').update(editingUser.id, {
          name: formData.name,
          whatsapp: normalizeWhatsapp(formData.whatsapp),
          email: formData.email || null,
        })
        notify("Usuario actualizado correctamente", "success")
        fetchUsers()
        resetForm()
      } else {
        const normalizedWhatsapp = normalizeWhatsapp(formData.whatsapp)
        const data = await pb.collection('users').create({
          email: formData.email,
          password: formData.password,
          passwordConfirm: formData.password,
          name: formData.name,
          whatsapp: normalizedWhatsapp,
          role: "user",
          status: "active",
        })
        notify("Usuario creado correctamente. El usuario puede iniciar sesión.", "success")
        setNewUserWhatsapp(normalizedWhatsapp)
        setShowSendCreds(true)
        fetchUsers()
        resetForm()
      }
    } catch (error) {
      console.error("Error guardando usuario:", error)
      if (error.message?.includes("already exists")) {
        notify("El email ya está registrado. Usa otro email.", "error")
      } else {
        notify("Error al guardar usuario: " + (error.message || error), "error")
      }
    }
  }

  function sendCredentials() {
    const message = encodeURIComponent(`¡Bienvenido/a!\n\nTus credenciales de acceso:\n\n📧 Email: ${formData.email}\n🔐 Contraseña: ${formData.password}\n\nPuedes cambiar tu contraseña desde tu perfil.\n\n¡Gracias por confiar en nuestros servicios!`)
    const whatsappNum = newUserWhatsapp.replace(/\D/g, "")
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, "_blank")
    setShowSendCreds(false)
  }

  function resetForm() {
    setShowForm(false)
    setEditingUser(null)
    setFormData({ name: "", whatsapp: "", email: "", password: "" })
  }

  function handleEdit(user) {
    setEditingUser(user)
    setFormData({ name: user.name, whatsapp: user.whatsapp || "", email: user.email || "", password: "" })
    setShowForm(true)
  }

  async function handleDelete(userOrId) {
    const isObject = typeof userOrId === "object" && userOrId !== null
    const id = isObject ? userOrId.id : userOrId
    const name = isObject ? userOrId.name : "este usuario"
    if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return
    try {
      await pb.collection('users').delete(id)
      fetchUsers()
    } catch (error) {
      console.error("Error eliminando usuario:", error)
      notify("Error al eliminar usuario", "error")
    }
  }

  async function toggleUserStatus(user) {
    try {
      const newStatus = user.status === "active" ? "suspended" : "active"
      await pb.collection('users').update(user.id, { status: newStatus })
      setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)))
    } catch (err) {
      console.error("Error al cambiar estado:", err)
      notify("Error al cambiar el estado del usuario", "error")
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) {
      notify("La contraseña debe tener al menos 6 caracteres", "error")
      return
    }
    if (!passwordUser?.id) {
      notify("Error: No hay usuario seleccionado", "error")
      return
    }
    setChangingPassword(true)
    try {
      await pb.collection('users').update(passwordUser.id, { password: newPassword, passwordConfirm: newPassword })
      notify("Contraseña actualizada correctamente", "success")
      setShowPasswordModal(false)
      setNewPassword("")
      setPasswordUser(null)
    } catch (err) {
      console.error("Error cambiando contraseña:", err)
      notify("Error al cambiar contraseña: " + (err.message || err), "error")
    } finally {
      setChangingPassword(false)
    }
  }

  function openAddService() {
    setEditingService(null)
    setServiceForm({ service_id: "", price: "", owner: 0, expires_at: "", next_billing_date: "", url_dominio: "", notes: "", billing_type: "monthly", no_expiry: false })
    fetchBaseServices()
    setShowServiceModal(true)
  }

  function openEditService(service) {
    setEditingService(service)
    setServiceForm({
      service_id: service.service_id || "",
      price: service.price || "",
      owner: service.owner ?? 0,
      expires_at: service.expires_at ? service.expires_at.split("T")[0] : "",
      next_billing_date: service.next_billing_date ? service.next_billing_date.split("T")[0] : "",
      url_dominio: service.url_dominio || "",
      notes: service.notes || "",
      billing_type: service.billing_type || "monthly",
      no_expiry: service.no_expiry === true,
    })
    fetchBaseServices()
    setShowServiceModal(true)
  }

  async function handleSaveService(e) {
    e.preventDefault()
    if (!serviceForm.service_id) {
      notify("Selecciona un servicio base", "warning")
      return
    }
    if (!selectedUser?.id) {
      notify("Error: No hay cliente seleccionado", "error")
      return
    }
    try {
      const data = {
        service_id: serviceForm.service_id,
        price: serviceForm.price ? parseFloat(serviceForm.price) : null,
        owner: serviceForm.owner,
        billing_type: serviceForm.billing_type,
        no_expiry: serviceForm.no_expiry,
        expires_at: serviceForm.no_expiry ? null : (serviceForm.expires_at || null),
        next_billing_date: serviceForm.next_billing_date || null,
        url_dominio: serviceForm.url_dominio || null,
        notes: serviceForm.notes || null,
        status: serviceForm.no_expiry || serviceForm.expires_at ? "active" : "pending",
      }

      if (editingService) {
        await pb.collection('user_services').update(editingService.id, data)
      } else {
        await pb.collection('user_services').create({ ...data, user_id: selectedUser.id })
      }

      notify(editingService ? "Servicio actualizado" : "Servicio agregado", "success")
      setShowServiceModal(false)
      viewUserDetails(selectedUser)
      fetchUsers()
    } catch (error) {
      console.error("Error guardando servicio:", error)
      notify("Error al guardar servicio: " + (error.message || error), "error")
    }
  }

  async function handleDeleteService(serviceId) {
    if (!confirm("¿Eliminar este servicio?")) return
    try {
      await pb.collection('user_services').delete(serviceId)
      viewUserDetails(selectedUser)
      fetchUsers()
    } catch (error) {
      console.error("Error eliminando servicio:", error)
    }
  }

  async function handleSaveServiceAccesses(serviceId, content) {
    try {
      await pb.collection('user_services').update(serviceId, { accesos: content })
      setUserServices(userServices.map((s) => (s.id === serviceId ? { ...s, accesos: content } : s)))
      if (selectedService?.id === serviceId) {
        setSelectedService({ ...selectedService, accesos: content })
      }
    } catch (err) {
      console.error("Error guardando accesos de servicio:", err)
    }
  }

  async function viewServicePayments(service) {
    setSelectedService(service)
    setLoadingPayments(true)
    setShowPaymentsModal(true)
    const result = await getPaymentsByUserService(service.id)
    setServicePayments(result.success ? (result.data || []) : [])
    if (!result.success) notify("Error al cargar pagos", "error")
    setLoadingPayments(false)
  }

  async function openUserPayments(user) {
    if (!isAdmin) return
    setPaymentsUser(user)
    setLoadingUserPayments(true)
    setShowUserPaymentsModal(true)
    try {
      const [paymentsData, servicesData] = await Promise.all([
        pb.collection('payments').getFullList({
          filter: `user_id = "${user.id}"`,
          sort: '-payment_date',
          expand: 'user_service_id',
        }),
        pb.collection('user_services').getFullList({
          filter: `user_id = "${user.id}"`,
          sort: '-created',
          expand: 'service_id',
        }),
      ])
      setPaymentsForUser(paymentsData || [])
      setUserServicesForPayments(servicesData || [])
    } catch (err) {
      console.error("Error cargando pagos del usuario:", err)
      setPaymentsForUser([])
      setUserServicesForPayments([])
    } finally {
      setLoadingUserPayments(false)
    }
  }

  async function handleRegisterPayment(e) {
    e.preventDefault()
    const userId = paymentsUser?.id
    if (!userId) return
    if (!paymentForm.amount) { notify("Ingresa un monto", "error"); return }
    setRegisteringPayment(true)
    try {
      const payload = {
        user_id: userId,
        user_service_id: paymentForm.service_id || null,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date || new Date().toISOString(),
        payment_method: paymentForm.payment_method,
        status: "paid",
      }
      await pb.collection('payments').create(payload)
      notify("Pago registrado correctamente", "success")
      await openUserPayments(paymentsUser)
      setPaymentForm({ service_id: "", amount: "", payment_date: "", payment_method: "transferencia" })
    } catch (err) {
      console.error("Error registrando pago:", err)
      notify("Error al registrar pago: " + (err.message || err), "error")
    } finally {
      setRegisteringPayment(false)
    }
  }

  async function handleMarkPaymentPaidUser(paymentId) {
    const result = await updatePaymentStatus(paymentId, "paid")
    if (result.success) {
      setPaymentsForUser((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p)))
    }
  }

  async function handleMarkPaymentPaid(paymentId) {
    const result = await updatePaymentStatus(paymentId, "paid")
    if (result.success) {
      setServicePayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p)))
      viewUserDetails(selectedUser)
    }
  }

  async function handleMarkPaymentPending(paymentId) {
    const result = await updatePaymentStatus(paymentId, "pending")
    if (result.success) {
      setServicePayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" } : p)))
    }
  }

  function getDaysRemaining(expiresAt) {
    if (!expiresAt) return null
    const today = new Date()
    const expires = new Date(expiresAt)
    return Math.ceil((expires - today) / (1000 * 60 * 60 * 24))
  }

  function getPaymentStatus(service) {
    const days = getDaysRemaining(service.expires_at)
    if (days === null) return { label: "Sin fecha", color: "secondary" }
    if (days < 0) return { label: "Vencido", color: "destructive" }
    if (days <= 7) return { label: "Por Vencer", color: "outline" }
    return { label: "Al día", color: "default" }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div>
          <Button variant="ghost" onClick={() => { setSelectedUser(null); setUserServices([]) }} className="gap-2 mb-4">
            <ChevronLeft className="w-4 h-4" />
            Volver a usuarios
          </Button>

          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary/80 to-primary/60 p-6 lg:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-foreground/70">Cliente</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-primary-foreground">{selectedUser.name}</h1>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary-foreground">{selectedUser.name?.charAt(0).toUpperCase() || "U"}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{userServices.filter((s) => s.status === "active").length}</p>
                <p className="text-xs text-primary-foreground/60">Activos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{userServices.filter((s) => s.status === "pending").length}</p>
                <p className="text-xs text-primary-foreground/60">Pendientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-foreground">{userServices.length}</p>
                <p className="text-xs text-primary-foreground/60">Total</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex gap-2 flex-wrap">
                {isAdmin && (userServices || []).some((s) => s.owner !== 1) && (
                  <Button variant="outline" size="sm" onClick={() => openUserPayments(selectedUser)} className="gap-2">
                    <DollarSign className="w-4 h-4" />
                    Pagos
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => { setPasswordUser(selectedUser); setShowPasswordModal(true) }} className="gap-2">
                  <Lock className="w-4 h-4" />
                  Cambiar Pass
                </Button>
              </div>

              <Card>
                <div className="flex items-center justify-between p-5 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Dominios / Servicios</h2>
                  </div>
                  <Button size="sm" onClick={openAddService}>
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar
                  </Button>
                </div>
                <div className="p-5">
                  {userServices.length === 0 ? (
                    <div className="text-center py-8"><p className="text-muted-foreground font-medium">No tiene servicios contratados</p></div>
                  ) : (
                    <div className="space-y-3">
                      {userServices.map((service) => {
                        const daysRemaining = getDaysRemaining(service.expires_at)
                        const paymentStatus = getPaymentStatus(service)
                        const ownerLabel = service.owner === 1 ? "Cliente paga" : "Lo administro"
                        const ownerColor = service.owner === 1 ? "default" : "secondary"
                        const websiteName = (() => {
                          if (!service.url_dominio) return null
                          try { return new URL(normalizeUrl(service.url_dominio)).hostname }
                          catch (e) { return service.url_dominio }
                        })()
                        return (
                          <div key={service.id} className="group relative overflow-hidden rounded-lg border bg-card p-5 hover:border-primary/50 transition-all">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <Badge variant={ownerColor}>{ownerLabel}</Badge>
                                  <Badge variant={service.status === "active" ? "default" : service.status === "pending" ? "secondary" : "destructive"}>
                                    {service.status === "active" ? "Activo" : service.status === "pending" ? "Pendiente" : "Vencido"}
                                  </Badge>
                                  <Badge variant={paymentStatus.color}>{paymentStatus.label}</Badge>
                                </div>
                                <h3 className="font-extrabold text-foreground text-lg sm:text-xl mb-1 break-all">
                                  {websiteName ? (
                                    <a href={normalizeUrl(service.url_dominio)} target="_blank" rel="noopener noreferrer" className="hover:underline inline-flex items-center gap-1">
                                      {websiteName}
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : (service.expand?.service_id?.name || service.name || "Servicio sin nombre")}
                                </h3>
                                {websiteName && (service.expand?.service_id?.name || service.name) && (
                                  <p className="text-sm text-muted-foreground mt-1">{service.expand?.service_id?.name || service.name}</p>
                                )}
                                {service.expand?.service_id?.type && (
                                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-primary/10 text-primary">{service.expand.service_id.type}</span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1.5">
                                  <Link to={`/service/${service.id}/credentials`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-purple-500/10 text-purple-500 hover:bg-purple-500 hover:text-white text-xs font-medium transition-all">
                                    <Key className="w-3 h-3" />
                                    <span className="hidden sm:inline">Accesos</span>
                                  </Link>
                                  {isAdmin && service.owner !== 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); viewServicePayments(service) }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white text-xs font-medium transition-all">
                                      <CreditCard className="w-3 h-3" />
                                      <span className="hidden sm:inline">Pagos</span>
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); openEditService(service) }} className="p-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id) }} className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                {service.expires_at && daysRemaining !== null && (
                                  <div className={`flex items-center justify-center w-16 h-16 rounded-md text-lg font-extrabold ${
                                    daysRemaining >= 20 ? "bg-green-500/10 text-green-500 border-2 border-green-500/20" :
                                    daysRemaining >= 7 ? "bg-orange-500/10 text-orange-500 border-2 border-orange-500/20" :
                                    daysRemaining >= 0 ? "bg-yellow-500/10 text-yellow-500 border-2 border-yellow-500/20" :
                                    "bg-destructive/10 text-destructive border-2 border-destructive/20"
                                  }`}>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-xl">{daysRemaining}</span>
                                      <span className="text-[10px] font-normal">d</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">{service.billing_type === "annual" ? "Precio anual" : "Precio mensual"}</p>
                                <p className="text-xl font-bold text-primary">{formatCurrency(service.price || 0)}</p>
                              </div>
                              {service.expires_at && <div className="text-right"><p className="text-sm text-muted-foreground">Vence: {formatDate(service.expires_at)}</p></div>}
                            </div>
                            {service.next_billing_date && service.owner === 1 && (
                              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                                <p className="text-xs text-green-500 font-medium">Próximo cobro al cliente:</p>
                                <p className="text-sm font-semibold text-green-500">{formatDate(service.next_billing_date)}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <Card>
                <div className="flex items-center gap-3 p-5 border-b">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Info className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Soporte</h2>
                </div>
                <div className="p-5 space-y-4">
                  {selectedUser.email && (
                    <a href={`mailto:${selectedUser.email}`} className="flex items-center gap-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-500/70 font-medium">Email</p>
                        <p className="text-sm font-semibold text-foreground truncate">{selectedUser.email}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-blue-500" />
                    </a>
                  )}
                  {selectedUser.whatsapp && (
                    <a href={`https://wa.me/${normalizeWhatsapp(selectedUser.whatsapp)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all group">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-500/70 font-medium">WhatsApp</p>
                        <p className="text-sm font-semibold text-foreground truncate">{formatWhatsapp(selectedUser.whatsapp) || selectedUser.whatsapp}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-green-500" />
                    </a>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>

        <Modal isOpen={showServiceModal} onClose={() => setShowServiceModal(false)} title={editingService ? "Editar Servicio" : "Agregar Servicio"} size="md">
          <form onSubmit={handleSaveService} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Servicio base</label>
              <select value={serviceForm.service_id} onChange={(e) => setServiceForm({ ...serviceForm, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                <option value="">Seleccionar servicio...</option>
                {baseServices.map((s) => (<option key={s.id} value={s.id}>{s.name} ({s.type})</option>))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Precio</label>
                <input type="number" value={serviceForm.price} onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })} placeholder="0" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1.5 cursor-pointer">
                  <input type="checkbox" checked={serviceForm.no_expiry} onChange={(e) => setServiceForm({ ...serviceForm, no_expiry: e.target.checked, expires_at: e.target.checked ? "" : serviceForm.expires_at })} className="w-4 h-4 rounded border-primary text-primary" />
                  Sin fecha de vencimiento
                </label>
                {!serviceForm.no_expiry && (
                  <input type="date" value={serviceForm.expires_at} onChange={(e) => setServiceForm({ ...serviceForm, expires_at: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo de facturación</label>
              <div className="grid grid-cols-2 gap-3">
                {["monthly", "annual"].map((type) => (
                  <label key={type} className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${serviceForm.billing_type === type ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <input type="radio" name="billing_type" value={type} checked={serviceForm.billing_type === type} onChange={() => setServiceForm({ ...serviceForm, billing_type: type })} className="hidden" />
                    <Calendar className={`w-5 h-5 ${serviceForm.billing_type === type ? "text-primary" : "text-muted-foreground"}`} />
                    <span className="font-medium text-sm">{type === "monthly" ? "Mensual" : "Anual"}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">¿Quién paga?</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${serviceForm.owner === 0 ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                  <input type="radio" name="owner" value={0} checked={serviceForm.owner === 0} onChange={() => setServiceForm({ ...serviceForm, owner: 0 })} className="hidden" />
                  <span className="font-medium text-sm">Lo administro</span>
                </label>
                <label className={`flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${serviceForm.owner === 1 ? "border-green-500 bg-green-500/10" : "border-border hover:bg-muted"}`}>
                  <input type="radio" name="owner" value={1} checked={serviceForm.owner === 1} onChange={() => setServiceForm({ ...serviceForm, owner: 1 })} className="hidden" />
                  <span className="font-medium text-sm">Cliente paga</span>
                </label>
              </div>
            </div>
            {serviceForm.owner === 1 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Próximo cobro al cliente</label>
                <input type="date" value={serviceForm.next_billing_date} onChange={(e) => setServiceForm({ ...serviceForm, next_billing_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">URL del dominio</label>
              <input type="url" value={serviceForm.url_dominio} onChange={(e) => setServiceForm({ ...serviceForm, url_dominio: e.target.value })} placeholder="https://dominio.com" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Notas</label>
              <textarea value={serviceForm.notes} onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })} rows={2} placeholder="Observaciones..." className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1">{editingService ? "Guardar Cambios" : "Agregar Servicio"}</Button>
              <Button type="button" variant="outline" onClick={() => setShowServiceModal(false)} className="flex-1">Cancelar</Button>
            </div>
          </form>
        </Modal>

        {showPasswordModal && (
          <Modal isOpen={showPasswordModal} onClose={() => { setShowPasswordModal(false); setNewPassword(""); setPasswordUser(null) }} title="Cambiar Contraseña" size="sm">
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Ingresa la nueva contraseña para el usuario <span className="text-foreground font-medium">{passwordUser?.name}</span></p>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nueva contraseña</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowPasswordModal(false); setNewPassword(""); setPasswordUser(null) }} className="flex-1">Cancelar</Button>
                <Button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 6} className="flex-1">{changingPassword ? "Cambiando..." : "Guardar"}</Button>
              </div>
            </div>
          </Modal>
        )}

        <Modal isOpen={showPaymentsModal} onClose={() => setShowPaymentsModal(false)} title={`Pagos - ${selectedService?.expand?.service_id?.name || "Servicio"}`} size="md">
          {loadingPayments ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : servicePayments.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No hay pagos para este servicio</p>
          ) : (
            <div className="space-y-3">
              {servicePayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div>
                    <p className="font-medium text-foreground">{formatCurrency(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status === "paid" ? "Pagado" : "Pendiente"}</Badge>
                    {p.status !== "paid" && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaymentPaid(p.id)}>Pagar</Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => handleMarkPaymentPending(p.id)}>Pendiente</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <Modal isOpen={showForm} onClose={resetForm} title={editingUser ? "Editar Usuario" : "Nuevo Usuario"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre</label>
            <Input placeholder="Nombre completo" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Email</label>
            <Input type="email" placeholder="correo@ejemplo.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          </div>
          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">Contraseña</label>
              <Input type="password" placeholder="Contraseña" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">WhatsApp</label>
            <Input type="text" placeholder="+57 3201112233" value={formData.whatsapp} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button type="submit" className="flex-1">{editingUser ? "Guardar Cambios" : "Crear Usuario"}</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {showSendCreds && (
        <Modal isOpen={showSendCreds} onClose={() => setShowSendCreds(false)} title="Enviar Credenciales" size="sm">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-foreground font-medium">¿Enviar credenciales por WhatsApp?</p>
            <p className="text-muted-foreground text-sm">Se enviarán el email y contraseña al número registrado</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowSendCreds(false)} className="flex-1">Ahora no</Button>
              <Button onClick={sendCredentials} className="flex-1 gap-2">
                <MessageCircle className="w-4 h-4" />
                Enviar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Usuario</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">WhatsApp</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Servicios</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">No hay usuarios registrados.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-all cursor-pointer" onClick={() => viewUserDetails(user)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.whatsapp ? (
                        <a href={`https://wa.me/${normalizeWhatsapp(user.whatsapp)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-green-500 hover:underline text-sm">
                          <MessageCircle className="w-3 h-3" />
                          {formatWhatsapp(user.whatsapp)}
                        </a>
                      ) : <span className="text-muted-foreground text-sm">-</span>}
                    </td>
                    <td className="px-6 py-4"><span className="font-semibold text-foreground">{user.service_count}</span></td>
                    <td className="px-6 py-4">
                      {user.min_days_to_renewal !== null ? (
                        <span className={`text-sm font-medium ${user.min_days_to_renewal < 0 ? "text-destructive" : user.min_days_to_renewal <= 7 ? "text-orange-500" : "text-green-500"}`}>
                          {user.min_days_to_renewal < 0 ? `${Math.abs(user.min_days_to_renewal)} días vencido` : `${user.min_days_to_renewal} días`}
                        </span>
                      ) : <span className="text-muted-foreground text-sm">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={(e) => { e.stopPropagation(); toggleUserStatus(user) }} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${user.status === "active" ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                        {user.status === "active" ? <><Activity className="w-3 h-3" />Activo</> : <><EyeOff className="w-3 h-3" />Suspendido</>}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}><Edit3 className="w-4 h-4 mr-1" />Editar</Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(user)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4 mr-1" />Eliminar</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showUserPaymentsModal && (
        <Modal isOpen={showUserPaymentsModal} onClose={() => setShowUserPaymentsModal(false)} title={`Pagos - ${paymentsUser?.name}`} size="lg">
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Registrar Pago</h3>
              <form onSubmit={handleRegisterPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select value={paymentForm.service_id} onChange={(e) => setPaymentForm({ ...paymentForm, service_id: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Sin servicio</option>
                  {userServicesForPayments.map((s) => (<option key={s.id} value={s.id}>{s.expand?.service_id?.name || "Servicio"}</option>))}
                </select>
                <Input type="number" placeholder="Monto" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} />
                <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} />
                <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="transferencia">Transferencia</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="nequi">Nequi</option>
                  <option value="otro">Otro</option>
                </select>
                <Button type="submit" disabled={registeringPayment} className="sm:col-span-2">
                  {registeringPayment ? "Registrando..." : "Registrar Pago"}
                </Button>
              </form>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
              {loadingUserPayments ? (
                <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
              ) : paymentsForUser.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No hay pagos registrados</p>
              ) : (
                paymentsForUser.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="font-medium text-foreground">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)} - {p.payment_method}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status === "paid" ? "Pagado" : "Pendiente"}</Badge>
                      {p.status !== "paid" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaymentPaidUser(p.id)}>Pagar</Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
