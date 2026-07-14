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
import { generateMonthlyPayments, getPaymentsByUserService, updatePaymentStatus } from "@/utils/paymentUtils"
import {
  Users, UserPlus, Mail, Phone, MessageCircle, ChevronLeft, Edit3, Trash2, Plus,
  Eye, EyeOff, Loader2, ExternalLink, Key, Calendar, DollarSign, CreditCard,
  User, Package, Info, Activity, ToggleLeft, ToggleRight, ArrowUpRight, Lock, RefreshCw,
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
    url_dominio: "", notes: "", billing_type: "monthly", no_expiry: false, tarjeta: "", start_date: "", requiere_abono: false,
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
  const { isAdmin, profile } = useAuth()
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordUser, setPasswordUser] = useState(null)
  const [paymentAccounts, setPaymentAccounts] = useState([])
  const [showAccountDialog, setShowAccountDialog] = useState(false)
  const [pendingPayAccount, setPendingPayAccount] = useState("")
  const [pendingPaymentId, setPendingPaymentId] = useState(null)


  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const usersData = await pb.collection('users').getFullList({ requestKey: null })
      const userServicesData = await pb.collection('user_services').getFullList({ requestKey: null })

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
      const data = await pb.collection('services').getFullList({ sort: 'name', requestKey: null })
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
        requestKey: null,
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
      const servicesWithPayment = await Promise.all(servicesWithDays.map(async (s) => {
        if (s.requiere_abono) {
          const payments = await pb.collection('payments').getFullList({
            filter: `user_service_id = "${s.id}"`,
            requestKey: null,
          })
          const totalPaid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          const totalExpected = payments
            .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          return { ...s, totalPaid, totalExpected }
        }
        return s
      }))
      setUserServices(servicesWithPayment)
    } catch (err) {
      console.error("Error cargando servicios del usuario:", err)
      setUserServices([])
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      if (editingUser) {
        const updateData = {
          name: formData.name,
          whatsapp: normalizeWhatsapp(formData.whatsapp),
          email: formData.email || null,
        }
        if (formData.password) {
          updateData.password = formData.password
          updateData.passwordConfirm = formData.password
        }
        await pb.collection('users').update(editingUser.id, updateData)
        if (formData.password) {
          try { await pb.collection('users').update(editingUser.id, { plain_password: formData.password }) } catch (e) { console.warn("plain_password falló, ¿existe el campo?", e) }
        }
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
        try { await pb.collection('users').update(data.id, { plain_password: formData.password }) } catch (e) { console.warn("plain_password falló, ¿existe el campo?", e) }
        notify("Usuario creado correctamente. El usuario puede iniciar sesión.", "success")
        setNewUserWhatsapp(normalizedWhatsapp)
        setShowSendCreds(true)
        fetchUsers()
        resetForm()
      }
    } catch (error) {
      console.error("Error guardando usuario:", error)
      console.error("Detalles:", JSON.stringify(error.data || error.response || {}, null, 2))
      if (error.message?.includes("already exists")) {
        notify("El email ya está registrado. Usa otro email.", "error")
      } else if (error.data?.data) {
        const details = Object.entries(error.data.data).map(([k, v]) => `${k}: ${v?.message || v?.code}`).join(", ")
        notify("Error: " + details || (error.message || error), "error")
      } else {
        notify("Error al guardar usuario: " + (error.message || error), "error")
      }
    }
  }

  function sendUserCredentials(user) {
    const password = user.plain_password
    if (!password) {
      notify("No hay contraseña guardada. Edita el usuario y establece una contraseña primero.", "error")
      return
    }
    const message = encodeURIComponent(
      `Hola ${user.name}, bienvenido/a.\n\n` +
      `Tus credenciales de acceso: https://clientes.nilspineda.com\n` +
      `Email: ${user.email}\n` +
      `Contraseña: ${password}\n\n` +
      `Puedes cambiar tu contraseña desde tu perfil.\n\n` +
      `Gracias por confiar en nuestros servicios.`
    )
    const whatsappNum = normalizeWhatsapp(user.whatsapp).replace(/\D/g, "")
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, "_blank")
  }

  function sendCredentials() {
    const message = encodeURIComponent(
      `Hola ${formData.name || ''}, bienvenido/a.\n\n` +
      `Tus credenciales de acceso: https://clientes.nilspineda.com\n` +
      `Email: ${formData.email}\n` +
      `Contraseña: ${formData.password}\n\n` +
      `Puedes cambiar tu contraseña desde tu perfil.\n\n` +
      `Gracias por confiar en nuestros servicios.`
    )
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
    setServiceForm({ service_id: "", price: "", owner: 0, expires_at: "", next_billing_date: "", url_dominio: "", notes: "", billing_type: "monthly", no_expiry: false, tarjeta: "", start_date: "", requiere_abono: false })
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
      tarjeta: service.tarjeta || "",
      start_date: service.start_date ? service.start_date.split("T")[0] : "",
      requiere_abono: service.requiere_abono === true,
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
        tarjeta: serviceForm.tarjeta || null,
        start_date: serviceForm.start_date || null,
        requiere_abono: serviceForm.requiere_abono,
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
        const newService = await pb.collection('user_services').create({ ...data, user_id: selectedUser.id })
        const baseService = baseServices.find(s => s.id === serviceForm.service_id)
        if (baseService?.type === "membresia" && data.owner === 0) {
          try { await generateMonthlyPayments(newService.id) } catch (err) { console.error(err) }
        }
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
          requestKey: null,
        }),
        pb.collection('user_services').getFullList({
          filter: `user_id = "${user.id}"`,
          sort: '-created',
          expand: 'service_id',
          requestKey: null,
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

  async function fetchPaymentAccounts() {
    try {
      const data = await pb.collection('payment_accounts').getFullList({ sort: 'name', requestKey: null })
      setPaymentAccounts(data || [])
    } catch (err) {
      console.error("Error cargando cuentas:", err)
      setPaymentAccounts([])
    }
  }

  async function handleMarkPaymentPaidUser(paymentId) {
    const result = await updatePaymentStatus(paymentId, "paid")
    if (result.success) {
      setPaymentsForUser((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p)))
    }
  }

  async function handleMarkPaymentPaid(paymentId, accountId) {
    const payload = { status: "paid" }
    if (accountId) payload.payment_account = accountId
    try {
      await pb.collection('payments').update(paymentId, payload)
      notify('Pago actualizado correctamente', 'success')
      setServicePayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "paid", payment_account: accountId } : p)))
      viewUserDetails(selectedUser)
    } catch (err) {
      console.error('Error updating payment status:', err)
      notify('Error al actualizar el pago', 'error')
    }
  }

  async function handleMarkPaymentPending(paymentId) {
    const result = await updatePaymentStatus(paymentId, "pending")
    if (result.success) {
      setServicePayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" } : p)))
    }
  }

  async function handleRenewService(service) {
    if (!confirm(`¿Renovar "${service.expand?.service_id?.name || 'este servicio'}" por 1 año más?`)) return
    try {
      const currentExpiry = new Date(service.expires_at)
      const newExpiry = new Date(currentExpiry)
      newExpiry.setFullYear(newExpiry.getFullYear() + 1)
      await pb.collection('user_services').update(service.id, {
        expires_at: newExpiry.toISOString().split('T')[0],
        status: 'active',
      })
      const pending = await pb.collection('payments').getFullList({
        filter: `user_service_id = "${service.id}" && status = "pending"`,
        requestKey: null,
      })
      for (const p of pending) { await pb.collection('payments').delete(p.id) }
      await generateMonthlyPayments(service.id)
      notify(`Servicio renovado hasta ${formatDate(newExpiry.toISOString())}`, "success")
      viewUserDetails(selectedUser)
      fetchUsers()
    } catch (err) {
      console.error("Error renovando servicio:", err)
      notify("Error al renovar servicio", "error")
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

          <div className="relative overflow-hidden rounded-xl bg-card border border-border p-6 lg:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{selectedUser.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {selectedUser.email && (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      {selectedUser.email}
                    </span>
                  )}
                  {selectedUser.whatsapp && (
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {formatWhatsapp(selectedUser.whatsapp) || selectedUser.whatsapp}
                    </span>
                  )}
                  {selectedUser.lastLogin && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      Ultimo ingreso: {formatDate(selectedUser.lastLogin)}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted border border-border flex items-center justify-center">
                <span className="text-4xl font-bold text-foreground">{selectedUser.name?.charAt(0).toUpperCase() || "U"}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-border/50">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userServices.filter((s) => s.status === "active").length}</p>
                <p className="text-xs text-muted-foreground">Activos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userServices.filter((s) => s.status === "pending").length}</p>
                <p className="text-xs text-muted-foreground">Pendientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{userServices.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
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
                {selectedUser.whatsapp && (
                  <Button variant="outline" size="sm" onClick={() => sendUserCredentials(selectedUser)} className="gap-2 text-green-500 border-green-500/30 hover:bg-green-500/10">
                    <MessageCircle className="w-4 h-4" />
                    Enviar Credenciales
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
                                  <Link to={`/service/${service.id}/credentials`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-all">
                                    <Key className="w-3 h-3" />
                                    <span className="hidden sm:inline">Accesos</span>
                                  </Link>
                                  {isAdmin && service.owner !== 1 && (
                                    <button onClick={(e) => { e.stopPropagation(); viewServicePayments(service) }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white text-xs font-medium transition-all">
                                      <CreditCard className="w-3 h-3" />
                                      <span className="hidden sm:inline">Pagos</span>
                                    </button>
                                  )}
                                  {service.expand?.service_id?.type === "membresia" && daysRemaining !== null && daysRemaining <= 30 && (
                                    <button onClick={(e) => { e.stopPropagation(); handleRenewService(service) }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white text-xs font-medium transition-all">
                                      <RefreshCw className="w-3 h-3" />
                                      <span className="hidden sm:inline">Renovar</span>
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
                              <div className="text-right">
                                {service.expires_at && <p className="text-sm text-muted-foreground">Vence: {formatDate(service.expires_at)}</p>}
                                {service.start_date && service.no_expiry && <p className="text-sm text-muted-foreground">Inicio: {formatDate(service.start_date)}</p>}
                              </div>
                            </div>
                            {service.owner === 1 && (
                              <div className="mt-3 pt-3 border-t space-y-2">
                                {service.next_billing_date && (
                                  <div className="flex items-center justify-between">
                                    <p className="text-xs text-green-500 font-medium">Próximo cobro:</p>
                                    <p className="text-sm font-semibold text-green-500">{formatDate(service.next_billing_date)}</p>
                                  </div>
                                )}
                {service.tarjeta && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground font-medium">Tarjeta:</p>
                    <p className="text-sm font-semibold text-foreground">****{service.tarjeta}</p>
                  </div>
                )}
                              </div>
                            )}
                            {service.requiere_abono && service.totalExpected > 0 && (
                              <div className="mt-3 pt-3 border-t space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Abonado: <span className="font-semibold text-foreground">{formatCurrency(service.totalPaid || 0)}</span> de <span className="font-semibold text-foreground">{formatCurrency(service.totalExpected)}</span>
                                </p>
                                {(service.totalPaid || 0) < service.totalExpected && (
                                  <p className="text-xs font-medium text-destructive">
                                    Restante: {formatCurrency(service.totalExpected - (service.totalPaid || 0))}
                                  </p>
                                )}
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
                  <a href={`mailto:${profile?.email || ''}`} className="flex items-center gap-4 p-4 rounded-lg border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-blue-500/70 font-medium">Email del admin</p>
                      <p className="text-sm font-semibold text-foreground truncate">{profile?.email || 'No registrado'}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-blue-500" />
                  </a>
                  <a href={`https://wa.me/${normalizeWhatsapp(profile?.whatsapp || '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 rounded-lg border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 transition-all group">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-green-500/70 font-medium">WhatsApp del admin</p>
                      <p className="text-sm font-semibold text-foreground truncate">{formatWhatsapp(profile?.whatsapp) || profile?.whatsapp || 'No registrado'}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                  </a>
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
                {!serviceForm.no_expiry ? (
                  <input type="date" value={serviceForm.expires_at} onChange={(e) => setServiceForm({ ...serviceForm, expires_at: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                ) : (
                  <input type="date" value={serviceForm.start_date} onChange={(e) => setServiceForm({ ...serviceForm, start_date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
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
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted transition-all">
              <input type="checkbox" checked={serviceForm.owner === 1} onChange={(e) => setServiceForm({ ...serviceForm, owner: e.target.checked ? 1 : 0, tarjeta: e.target.checked ? serviceForm.tarjeta : "" })} className="w-4 h-4 rounded border-primary text-primary" />
              <div>
                <span className="font-medium text-sm text-foreground">Cliente paga</span>
                <p className="text-xs text-muted-foreground">El cliente gestiona y paga directamente este servicio</p>
              </div>
            </label>
            {serviceForm.owner === 1 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1.5">4 últimos dígitos de la tarjeta</label>
                  <input type="text" value={serviceForm.tarjeta} onChange={(e) => setServiceForm({ ...serviceForm, tarjeta: e.target.value.replace(/\D/g, '').slice(0, 4) })} placeholder="1234" maxLength={4} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
            )}
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted transition-all">
              <input type="checkbox" checked={serviceForm.requiere_abono} onChange={(e) => setServiceForm({ ...serviceForm, requiere_abono: e.target.checked })} className="w-4 h-4 rounded border-primary text-primary" />
              <div>
                <span className="font-medium text-sm text-foreground">Requiere abono</span>
                <p className="text-xs text-muted-foreground">Muestra el progreso de pago y el restante</p>
              </div>
            </label>
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
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{servicePayments.length} pagos registrados</p>
                <Button size="sm" variant="outline" onClick={async () => {
                  const result = await generateMonthlyPayments(selectedService.id)
                  if (result.success) {
                    notify("Pagos generados correctamente", "success")
                    const paymentsResult = await getPaymentsByUserService(selectedService.id)
                    setServicePayments(paymentsResult.success ? (paymentsResult.data || []) : [])
                    viewUserDetails(selectedUser)
                  }
                }}>
                  Generar Pagos
                </Button>
              </div>
              {servicePayments.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">No hay pagos para este servicio</p>
              ) : (
                <div className="space-y-3">
                  {servicePayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div>
                        <p className="font-medium text-foreground">{formatCurrency(p.amount)}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(p.payment_date)}</p>
                        {p.payment_account && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Cuenta: {typeof p.payment_account === 'object' ? p.payment_account.name : p.expand?.payment_account?.name || p.payment_account}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.status === "paid" ? "default" : "secondary"}>{p.status === "paid" ? "Pagado" : "Pendiente"}</Badge>
                        {p.status !== "paid" && (
                          <Button size="sm" variant="outline" onClick={() => { setPendingPaymentId(p.id); setPendingPayAccount(""); fetchPaymentAccounts(); setShowAccountDialog(true) }}>Pagar</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => handleMarkPaymentPending(p.id)}>Pendiente</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>

        {showAccountDialog && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setShowAccountDialog(false)}>
            <div className="bg-card border rounded-lg p-5 w-80 shadow-xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-semibold text-foreground mb-1">Registrar pago</h3>
              <p className="text-sm text-muted-foreground mb-4">¿A qué cuenta te pagaron?</p>
              {paymentAccounts.length === 0 ? (
                <p className="text-xs text-muted-foreground mb-3">No hay cuentas registradas. Créalas desde Control de Pagos.</p>
              ) : (
                <select value={pendingPayAccount} onChange={(e) => setPendingPayAccount(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mb-4">
                  <option value="">Seleccionar cuenta...</option>
                  {paymentAccounts.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAccountDialog(false)} className="flex-1">Cancelar</Button>
                <Button onClick={async () => {
                  await handleMarkPaymentPaid(pendingPaymentId, pendingPayAccount || null)
                  setShowAccountDialog(false)
                }} className="flex-1">Confirmar</Button>
              </div>
            </div>
          </div>
        )}
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
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Contraseña {!editingUser && <span className="text-destructive">*</span>}
              {editingUser && <span className="text-muted-foreground text-xs font-normal"> (dejar vacío para mantener)</span>}
            </label>
            <Input type="password" placeholder="Contraseña" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
          </div>
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
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Usuario</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">WhatsApp</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Servicios</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Vencimiento</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Acciones</th>
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
                        {user.whatsapp && (
                          <Button variant="ghost" size="sm" onClick={() => sendUserCredentials(user)} className="text-green-500 hover:text-green-600">
                            <MessageCircle className="w-4 h-4 mr-1" />Credenciales
                          </Button>
                        )}
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
