import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase, getSupabaseAdmin } from "../../lib/supabaseClient";
import { useAuth } from "../../hooks/useAuth";
import {
  normalizeWhatsapp,
  formatWhatsapp,
  normalizeUrl,
  formatCurrency,
} from "../../utils/formatUtils";
import { notify } from "../../utils/notify";
import { formatDate } from "../../utils/dateUtils";
import Modal from "../../components/Modal";
import {
  getPaymentsByUserService,
  updatePaymentStatus,
} from "../../utils/paymentUtils";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    password: "",
  });
  const [showSendCreds, setShowSendCreds] = useState(false);
  const [newUserWhatsapp, setNewUserWhatsapp] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [userServices, setUserServices] = useState([]);

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [serviceForm, setServiceForm] = useState({
    service_id: "",
    price: "",
    owner: 0,
    expires_at: "",
    next_billing_date: "",
    url_dominio: "",
    notes: "",
    billing_type: "monthly",
    no_expiry: false,
  });
  const [baseServices, setBaseServices] = useState([]);

  const [showPaymentsModal, setShowPaymentsModal] = useState(false);
  const [servicePayments, setServicePayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // User-level payments modal (admin only)
  const [showUserPaymentsModal, setShowUserPaymentsModal] = useState(false);
  const [paymentsForUser, setPaymentsForUser] = useState([]);
  const [loadingUserPayments, setLoadingUserPayments] = useState(false);
  const [userServicesForPayments, setUserServicesForPayments] = useState([]);
  const [paymentsUser, setPaymentsUser] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    service_id: "",
    amount: "",
    payment_date: "",
    payment_method: "transferencia",
  });
  const [registeringPayment, setRegisteringPayment] = useState(false);
  const { isAdmin } = useAuth();

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, name, email, whatsapp, status, accesos, user_services(id, owner, expires_at)",
        );
      if (error) throw error;
      const usersWithCount = (data || []).map((u) => ({
        ...u,
        service_count: Array.isArray(u.user_services)
          ? u.user_services.length
          : 0,
      }));

      // Calcular el mínimo de días hasta renovación por usuario (si existe)
      const usersWithRenewal = usersWithCount.map((u) => {
        const daysList = Array.isArray(u.user_services)
          ? u.user_services
              .map((s) => getDaysRemaining(s.expires_at))
              .filter((d) => d !== null && typeof d === "number")
          : [];
        const minDays = daysList.length > 0 ? Math.min(...daysList) : null;
        return { ...u, min_days_to_renewal: minDays };
      });

      // Ordenar de menor a mayor por días hasta renovación (nulos al final)
      usersWithRenewal.sort((a, b) => {
        if (a.min_days_to_renewal === null && b.min_days_to_renewal === null)
          return 0;
        if (a.min_days_to_renewal === null) return 1;
        if (b.min_days_to_renewal === null) return -1;
        return a.min_days_to_renewal - b.min_days_to_renewal;
      });

      setUsers(usersWithRenewal);
    } catch (err) {
      console.error("Error cargando usuarios:", err);
      console.error("Error details:", JSON.stringify(err, null, 2));
      notify("Error al cargar usuarios: " + (err?.message || err), "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBaseServices() {
    try {
      const { data } = await supabase
        .from("services")
        .select("id, name, type")
        .order("name", { ascending: true });
      setBaseServices(data || []);
    } catch (err) {
      console.error("Error cargando servicios base:", err);
      setBaseServices([]);
    }
  }

  async function viewUserDetails(user) {
    setSelectedUser(user);
    try {
      const { data } = await supabase
        .from("user_services")
        .select("*, services(id, name, type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Ordenar los servicios por días restantes (menor -> mayor). Los nulls (sin fecha) van al final.
      const services = data || [];
      const servicesWithDays = services
        .map((s) => ({ ...s, daysRemaining: getDaysRemaining(s.expires_at) }))
        .sort((a, b) => {
          const da = a.daysRemaining;
          const db = b.daysRemaining;
          if (da === null && db === null) return 0;
          if (da === null) return 1;
          if (db === null) return -1;
          return da - db;
        });

      setUserServices(servicesWithDays);
    } catch (err) {
      console.error("Error cargando servicios del usuario:", err);
      setUserServices([]);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      if (editingUser) {
        const { error } = await supabase
          .from("profiles")
          .update({
            name: formData.name,
            whatsapp: normalizeWhatsapp(formData.whatsapp),
            email: formData.email || null,
          })
          .eq("id", editingUser.id);

        if (error) throw error;
        notify("Usuario actualizado correctamente", "success");
        fetchUsers();
        resetForm();
      } else {
        const normalizedWhatsapp = normalizeWhatsapp(formData.whatsapp);

        // Usar API de Admin para crear usuario (no crea sesión automática)
        const admin = getSupabaseAdmin();
        if (!admin) {
          notify(
            "Error: No hay configuración de admin. Configura la service key.",
            "error",
          );
          return;
        }

        const { data, error } = await admin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: { name: formData.name, whatsapp: normalizedWhatsapp },
        });

        if (error) {
          if (
            error.message.includes("already been registered") ||
            error.message.includes("already exists")
          ) {
            notify("El email ya está registrado. Usa otro email.", "error");
            return;
          }
          throw error;
        }

        if (data?.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .insert({
              id: data.user.id,
              name: formData.name,
              whatsapp: normalizedWhatsapp,
              email: formData.email,
            });

          if (profileError && !profileError.message.includes("duplicate key")) {
            console.error("Error creando perfil:", profileError);
          }

          notify(
            "Usuario creado correctamente. El usuario puede iniciar sesión.",
            "success",
          );
          fetchUsers();
          resetForm();
        }
      }
    } catch (error) {
      console.error("Error guardando usuario:", error);
      notify("Error al guardar usuario: " + (error.message || error), "error");
    }
  }

  function sendCredentials() {
    const message = encodeURIComponent(
      `¡Bienvenido/a!\n\nTus credenciales de acceso:\n\n📧 Email: ${formData.email}\n🔐 Contraseña: ${formData.password}\n\nPuedes cambiar tu contraseña desde tu perfil.\n\n¡Gracias por confiar en nuestros servicios!`,
    );
    const whatsappNum = newUserWhatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${whatsappNum}?text=${message}`, "_blank");
    setShowSendCreds(false);
  }

  function resetForm() {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: "", whatsapp: "", email: "", password: "" });
  }

  function handleEdit(user) {
    setEditingUser(user);
    setFormData({
      name: user.name,
      whatsapp: user.whatsapp || "",
      email: user.email || "",
      password: "",
    });
    setShowForm(true);
  }

  async function handleDelete(userOrId) {
    const isObject = typeof userOrId === "object" && userOrId !== null;
    const id = isObject ? userOrId.id : userOrId;
    const name = isObject ? userOrId.name : "este usuario";

    if (!confirm(`¿Estás seguro de eliminar a ${name}?`)) return;
    try {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error("Error eliminando usuario:", error);
      notify("Error al eliminar usuario", "error");
    }
  }

  async function toggleUserStatus(user) {
    try {
      const newStatus = user.status === "active" ? "suspended" : "active";
      const { error } = await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);
      if (error) throw error;
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
      );
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      notify("Error al cambiar el estado del usuario", "error");
    }
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) {
      notify("La contraseña debe tener al menos 6 caracteres", "error");
      return;
    }
    if (!passwordUser?.id) {
      notify("Error: No hay usuario seleccionado", "error");
      return;
    }
    const admin = getSupabaseAdmin();
    if (!admin) {
      notify(
        "Error: Service key no configurada. Contacta al desarrollador.",
        "error",
      );
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await admin.auth.admin.updateUserById(passwordUser.id, {
        password: newPassword,
      });
      if (error) throw error;
      notify("Contraseña actualizada correctamente", "success");
      setShowPasswordModal(false);
      setNewPassword("");
      setPasswordUser(null);
    } catch (err) {
      console.error("Error cambiando contraseña:", err);
      notify("Error al cambiar contraseña: " + (err.message || err), "error");
    } finally {
      setChangingPassword(false);
    }
  }

  function openAddService() {
    setEditingService(null);
    setServiceForm({
      service_id: "",
      price: "",
      owner: 0,
      expires_at: "",
      next_billing_date: "",
      url_dominio: "",
      notes: "",
    });
    fetchBaseServices();
    setShowServiceModal(true);
  }

  function openEditService(service) {
    setEditingService(service);
    setServiceForm({
      service_id: service.service_id || "",
      price: service.price || "",
      owner: service.owner ?? 0,
      expires_at: service.expires_at ? service.expires_at.split("T")[0] : "",
      next_billing_date: service.next_billing_date
        ? service.next_billing_date.split("T")[0]
        : "",
      url_dominio: service.url_dominio || "",
      notes: service.notes || "",
      billing_type: service.billing_type || "monthly",
      no_expiry: service.no_expiry === true,
    });
    fetchBaseServices();
    setShowServiceModal(true);
  }

  async function handleSaveService(e) {
    e.preventDefault();
    if (!serviceForm.service_id) {
      notify("Selecciona un servicio base", "warning");
      return;
    }
    if (!selectedUser?.id) {
      notify("Error: No hay cliente seleccionado", "error");
      return;
    }
    try {
      const data = {
        service_id: serviceForm.service_id,
        price: serviceForm.price ? parseFloat(serviceForm.price) : null,
        owner: serviceForm.owner,
        billing_type: serviceForm.billing_type,
        no_expiry: serviceForm.no_expiry,
        expires_at: serviceForm.no_expiry
          ? null
          : serviceForm.expires_at || null,
        next_billing_date: serviceForm.next_billing_date || null,
        url_dominio: serviceForm.url_dominio || null,
        notes: serviceForm.notes || null,
        status:
          serviceForm.no_expiry || serviceForm.expires_at
            ? "active"
            : "pending",
      };

      let result;
      if (editingService) {
        result = await supabase
          .from("user_services")
          .update(data)
          .eq("id", editingService.id)
          .select();
      } else {
        result = await supabase
          .from("user_services")
          .insert({ ...data, user_id: selectedUser.id })
          .select();
      }

      if (result.error)
        throw new Error(result.error.message || "Error guardando servicio");

      notify(
        editingService ? "Servicio actualizado" : "Servicio agregado",
        "success",
      );
      setShowServiceModal(false);
      viewUserDetails(selectedUser);
      fetchUsers();
    } catch (error) {
      console.error("Error guardando servicio:", error);
      notify("Error al guardar servicio: " + (error.message || error), "error");
    }
  }

  async function handleDeleteService(serviceId) {
    if (!confirm("¿Eliminar este servicio?")) return;
    try {
      await supabase.from("user_services").delete().eq("id", serviceId);
      viewUserDetails(selectedUser);
      fetchUsers();
    } catch (error) {
      console.error("Error eliminando servicio:", error);
    }
  }

  async function handleSaveServiceAccesses(serviceId, content) {
    try {
      await supabase
        .from("user_services")
        .update({ accesos: content })
        .eq("id", serviceId);
      const updatedServices = userServices.map((s) =>
        s.id === serviceId ? { ...s, accesos: content } : s,
      );
      setUserServices(updatedServices);
      if (selectedService?.id === serviceId) {
        setSelectedService({ ...selectedService, accesos: content });
      }
    } catch (err) {
      console.error("Error guardando accesos de servicio:", err);
    }
  }

  async function viewServicePayments(service) {
    setSelectedService(service);
    setLoadingPayments(true);
    setShowPaymentsModal(true);

    const result = await getPaymentsByUserService(service.id);
    if (result.success) {
      setServicePayments(result.data || []);
    } else {
      setServicePayments([]);
      notify("Error al cargar pagos", "error");
    }
    setLoadingPayments(false);
  }

  async function openUserPayments(user) {
    if (!isAdmin) return;
    setPaymentsUser(user);
    setLoadingUserPayments(true);
    setShowUserPaymentsModal(true);
    try {
      const [paymentsRes, servicesRes] = await Promise.all([
        supabase
          .from("payments")
          .select(
            "*, user_services(id, name, url_dominio, owner, services(id, name))",
          )
          .eq("user_id", user.id)
          .order("payment_date", { ascending: false }),
        supabase
          .from("user_services")
          .select("id, name, url_dominio, owner, services(id, name)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      setPaymentsForUser(paymentsRes.data || []);
      setUserServicesForPayments(servicesRes.data || []);
    } catch (err) {
      console.error("Error cargando pagos del usuario:", err);
      setPaymentsForUser([]);
      setUserServicesForPayments([]);
    } finally {
      setLoadingUserPayments(false);
    }
  }

  async function handleRegisterPayment(e) {
    e.preventDefault();
    const userId = paymentsUser?.id;
    if (!userId) return;
    if (!paymentForm.amount) {
      notify("Ingresa un monto", "error");
      return;
    }
    setRegisteringPayment(true);
    try {
      const payload = {
        user_id: userId,
        service_id: paymentForm.service_id || null,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date || new Date().toISOString(),
        payment_method: paymentForm.payment_method,
        status: "paid",
      };

      const { error } = await supabase.from("payments").insert(payload);
      if (error) throw error;
      notify("Pago registrado correctamente", "success");
      // refresh list
      await openUserPayments(paymentsUser);
      setPaymentForm({
        service_id: "",
        amount: "",
        payment_date: "",
        payment_method: "transferencia",
      });
    } catch (err) {
      console.error("Error registrando pago:", err);
      notify("Error al registrar pago: " + (err.message || err), "error");
    } finally {
      setRegisteringPayment(false);
    }
  }

  async function handleMarkPaymentPaidUser(paymentId) {
    const result = await updatePaymentStatus(paymentId, "paid");
    if (result.success) {
      setPaymentsForUser((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p)),
      );
    }
  }

  async function handleMarkPaymentPaid(paymentId) {
    const result = await updatePaymentStatus(paymentId, "paid");
    if (result.success) {
      setServicePayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "paid" } : p)),
      );
      viewUserDetails(selectedUser);
    }
  }

  async function handleMarkPaymentPending(paymentId) {
    const result = await updatePaymentStatus(paymentId, "pending");
    if (result.success) {
      setServicePayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "pending" } : p)),
      );
    }
  }

  function getDaysRemaining(expiresAt) {
    if (!expiresAt) return null;
    const today = new Date();
    const expires = new Date(expiresAt);
    const diff = Math.ceil((expires - today) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getPaymentStatus(service) {
    const days = getDaysRemaining(service.expires_at);
    if (days === null) return { label: "Sin fecha", color: "gray" };
    if (days < 0) return { label: "Vencido", color: "red" };
    if (days <= 7) return { label: "Por Vencer", color: "orange" };
    return { label: "Al día", color: "green" };
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (selectedUser) {
    return (
      <div className="space-y-6">
        <div>
          <button
            onClick={() => {
              setSelectedUser(null);
              setUserServices([]);
            }}
            className="flex items-center gap-2 text-primary hover:text-primary-light font-medium"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Volver a usuarios
          </button>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary-dark to-[#0f2926] p-6 lg:p-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-light/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

            <div className="relative flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-primary-light/80">Cliente</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {selectedUser.name}
                </h1>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-foreground">
                  {selectedUser.name?.charAt(0).toUpperCase() || "U"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {userServices.filter((s) => s.status === "active").length}
                </p>
                <p className="text-xs text-primary-light/60">Activos</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {userServices.filter((s) => s.status === "pending").length}
                </p>
                <p className="text-xs text-primary-light/60">Pendientes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">
                  {userServices.length}
                </p>
                <p className="text-xs text-primary-light/60">Total</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
              {isAdmin && (userServices || []).some((s) => s.owner !== 1) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openUserPayments(selectedUser);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-foreground font-medium text-sm transition-all"
                >
                  Pagos
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setPasswordUser(selectedUser);
                  setShowPasswordModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-foreground font-medium text-sm transition-all"
              >
                Cambiar Pass
              </button>
              <div className="bg-card rounded-3xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center justify-between gap-2 ">
                    <h2 className="text-lg font-bold text-foreground">
                      Dominios / Servicios
                    </h2>
                    <button
                      onClick={openAddService}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-foreground rounded-lg text-sm font-medium transition-all"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Agregar
                    </button>
                  </div>
                </div>
                <div className="p-5 lg:p-6">
                  {userServices.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground font-medium">
                        No tiene servicios contratados
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userServices.map((service) => {
                        const daysRemaining = getDaysRemaining(
                          service.expires_at,
                        );
                        const paymentStatus = getPaymentStatus(service);
                        const ownerLabel =
                          service.owner === 1
                            ? "Cliente paga"
                            : "Lo administro";
                        const ownerColor =
                          service.owner === 1
                            ? "bg-green-500/20 text-green-400"
                            : "bg-blue-500/20 text-blue-400";
                        const websiteName = (() => {
                          if (!service.url_dominio) return null;
                          try {
                            return new URL(normalizeUrl(service.url_dominio))
                              .hostname;
                          } catch (e) {
                            return service.url_dominio;
                          }
                        })();
                        return (
                          <div
                            key={service.id}
                            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted to-card border border-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                          >
                            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:bg-primary/10 transition-colors"></div>

                            <div className="relative flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${ownerColor}`}
                                  >
                                    {ownerLabel}
                                  </span>
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${service.status === "active" ? "bg-green-500/20 text-green-400" : service.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}
                                  >
                                    {service.status === "active"
                                      ? "Activo"
                                      : service.status === "pending"
                                        ? "Pendiente"
                                        : "Vencido"}
                                  </span>
                                  <span
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${paymentStatus.color === "green" ? "bg-green-500/20 text-green-400" : paymentStatus.color === "orange" ? "bg-orange-500/20 text-orange-400" : paymentStatus.color === "red" ? "bg-red-500/20 text-red-400" : "bg-gray-500/20 text-gray-400"}`}
                                  >
                                    {paymentStatus.label}
                                  </span>
                                </div>
                                <h3 className="font-extrabold text-foreground text-lg sm:text-2xl mb-1">
                                  {websiteName ? (
                                    <a
                                      href={normalizeUrl(service.url_dominio)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {websiteName}
                                    </a>
                                  ) : (
                                    service.services?.name ||
                                    service.name ||
                                    "Servicio sin nombre"
                                  )}
                                </h3>
                                {websiteName &&
                                  (service.services?.name || service.name) && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {service.services?.name || service.name}
                                    </p>
                                  )}
                                {service.services?.type && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded ${service.services.type === "dominio" ? "bg-blue-500/20 text-blue-400" : service.services.type === "hosting" ? "bg-purple-500/20 text-purple-400" : service.services.type === "correo" ? "bg-yellow-500/20 text-yellow-400" : service.services.type === "membresia" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
                                  >
                                    {service.services.type}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2 sm:gap-2 flex-shrink-0">
                                <div className="flex items-center gap-1.5 sm:gap-2">
                                  <Link
                                    to={`/service/${service.id}/credentials`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="px-2 sm:px-3 py-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-foreground text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                                    title="Credenciales"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                                      />
                                    </svg>
                                    <span className="hidden sm:inline">
                                      Credenciales
                                    </span>
                                  </Link>
                                  {isAdmin && service.owner !== 1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        viewServicePayments(service);
                                      }}
                                      className="px-2 sm:px-3 py-1.5 rounded-lg bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-foreground text-xs sm:text-sm font-medium transition-all flex items-center gap-1"
                                      title="Ver pagos"
                                    >
                                      <svg
                                        className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                      </svg>
                                      <span className="hidden sm:inline">
                                        Pagos
                                      </span>
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditService(service);
                                    }}
                                    className="p-1.5 sm:p-2 rounded-lg bg-primary/10 hover:bg-primary text-primary hover:text-foreground transition-all"
                                    title="Editar servicio"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                      />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteService(service.id);
                                    }}
                                    className="p-1.5 sm:p-2 rounded-lg bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-foreground transition-all"
                                    title="Eliminar servicio"
                                  >
                                    <svg
                                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                      />
                                    </svg>
                                  </button>
                                </div>
                                {service.expires_at &&
                                  daysRemaining !== null && (
                                    <div
                                      className={`mt-2 flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-md text-lg sm:text-2xl font-extrabold ${daysRemaining >= 20 ? "bg-green-500/20 text-green-400 border-2 border-green-500/30" : daysRemaining >= 7 ? "bg-orange-500/20 text-orange-400 border-2 border-orange-500/30" : daysRemaining >= 0 ? "bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30" : "bg-red-500/20 text-red-400 border-2 border-red-500/30"}`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-2xl sm:text-3xl font-extrabold">
                                          {daysRemaining}
                                        </span>
                                        <span className="text-xs font-normal">
                                          d
                                        </span>
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                              <div>
                                <p className="text-xs text-muted-foreground">
                                  {service.billing_type === "annual"
                                    ? "Precio anual"
                                    : "Precio mensual"}
                                </p>
                                <p className="text-xl font-bold text-primary">
                                  {formatCurrency(service.price || 0)}
                                </p>
                              </div>
                              {service.expires_at && (
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">
                                    Vence: {formatDate(service.expires_at)}
                                  </p>
                                </div>
                              )}
                            </div>
                            {service.next_billing_date &&
                              service.owner === 1 && (
                                <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                                  <p className="text-xs text-green-400 font-medium">
                                    Próximo cobro al cliente:
                                  </p>
                                  <p className="text-sm font-semibold text-green-400">
                                    {formatDate(service.next_billing_date)}
                                  </p>
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card rounded-3xl border border-border overflow-hidden">
                <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-foreground">Soporte</h2>
                </div>
                <div className="p-5 lg:p-6 space-y-4">
                  {selectedUser.email && (
                    <a
                      href={`mailto:${selectedUser.email}`}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20 hover:border-blue-500/40 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-blue-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-blue-400/70 font-medium">
                          Email
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {selectedUser.email}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 text-blue-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </a>
                  )}

                  {selectedUser.whatsapp && (
                    <a
                      href={`https://wa.me/${normalizeWhatsapp(selectedUser.whatsapp)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg
                          className="w-6 h-6 text-green-400"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-green-400/70 font-medium">
                          WhatsApp
                        </p>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {formatWhatsapp(selectedUser.whatsapp) ||
                            selectedUser.whatsapp}
                        </p>
                      </div>
                      <svg
                        className="w-5 h-5 text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              {/* Accesos section removed per request */}
            </div>
          </div>
        </div>

        {/* Modal de Servicio */}
        <Modal
          isOpen={showServiceModal}
          onClose={() => setShowServiceModal(false)}
          title={editingService ? "Editar Servicio" : "Agregar Servicio"}
          size="md"
        >
          <form onSubmit={handleSaveService} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Servicio base
              </label>
              <select
                value={serviceForm.service_id}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, service_id: e.target.value })
                }
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                required
              >
                <option value="">Seleccionar servicio...</option>
                {baseServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.type})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Precio
                </label>
                <input
                  type="number"
                  value={serviceForm.price}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, price: e.target.value })
                  }
                  placeholder="0"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={serviceForm.no_expiry}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        no_expiry: e.target.checked,
                        expires_at: e.target.checked
                          ? ""
                          : serviceForm.expires_at,
                      })
                    }
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                  />
                  Sin fecha de vencimiento
                </label>
                {!serviceForm.no_expiry && (
                  <input
                    type="date"
                    value={serviceForm.expires_at}
                    onChange={(e) =>
                      setServiceForm({
                        ...serviceForm,
                        expires_at: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Tipo de facturación
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.billing_type === "monthly" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  <input
                    type="radio"
                    name="billing_type"
                    value="monthly"
                    checked={serviceForm.billing_type === "monthly"}
                    onChange={() =>
                      setServiceForm({
                        ...serviceForm,
                        billing_type: "monthly",
                      })
                    }
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5"
                    style={{
                      color:
                        serviceForm.billing_type === "monthly"
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium text-sm">Mensual</span>
                </label>
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.billing_type === "annual" ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  <input
                    type="radio"
                    name="billing_type"
                    value="annual"
                    checked={serviceForm.billing_type === "annual"}
                    onChange={() =>
                      setServiceForm({ ...serviceForm, billing_type: "annual" })
                    }
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5"
                    style={{
                      color:
                        serviceForm.billing_type === "annual"
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-medium text-sm">Anual</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                ¿Quién paga?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.owner === 0 ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                >
                  <input
                    type="radio"
                    name="owner"
                    value={0}
                    checked={serviceForm.owner === 0}
                    onChange={() =>
                      setServiceForm({ ...serviceForm, owner: 0 })
                    }
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5"
                    style={{
                      color:
                        serviceForm.owner === 0
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  <span
                    className="font-medium text-sm"
                    style={{
                      color:
                        serviceForm.owner === 0
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    Lo administro
                  </span>
                </label>
                <label
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.owner === 1 ? "border-green-500 bg-green-500/10" : "border-border hover:bg-muted"}`}
                >
                  <input
                    type="radio"
                    name="owner"
                    value={1}
                    checked={serviceForm.owner === 1}
                    onChange={() =>
                      setServiceForm({ ...serviceForm, owner: 1 })
                    }
                    className="hidden"
                  />
                  <svg
                    className="w-5 h-5"
                    style={{
                      color:
                        serviceForm.owner === 1
                          ? "#10b981"
                          : "var(--muted-foreground)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <span
                    className="font-medium text-sm"
                    style={{
                      color:
                        serviceForm.owner === 1
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                    }}
                  >
                    Cliente paga
                  </span>
                </label>
              </div>
            </div>
            {serviceForm.owner === 1 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Próximo cobro al cliente
                </label>
                <input
                  type="date"
                  value={serviceForm.next_billing_date}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      next_billing_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                URL del dominio
              </label>
              <input
                type="url"
                value={serviceForm.url_dominio}
                onChange={(e) =>
                  setServiceForm({
                    ...serviceForm,
                    url_dominio: e.target.value,
                  })
                }
                placeholder="https://dominio.com"
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Notas
              </label>
              <textarea
                value={serviceForm.notes}
                onChange={(e) =>
                  setServiceForm({ ...serviceForm, notes: e.target.value })
                }
                rows={2}
                placeholder="Observaciones..."
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-primary text-foreground px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
              >
                {editingService ? "Guardar Cambios" : "Agregar Servicio"}
              </button>
              <button
                type="button"
                onClick={() => setShowServiceModal(false)}
                className="flex-1 px-6 py-3 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Modal>

        {showPasswordModal && (
          <Modal
            isOpen={showPasswordModal}
            onClose={() => {
              setShowPasswordModal(false);
              setNewPassword("");
              setPasswordUser(null);
            }}
            title="Cambiar Contraseña"
            size="sm"
          >
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">
                Ingresa la nueva contraseña para el usuario{" "}
                <span className="text-foreground font-medium">
                  {passwordUser?.name}
                </span>
              </p>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setNewPassword("");
                    setPasswordUser(null);
                  }}
                  className="flex-1 px-4 py-3 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || newPassword.length < 6}
                  className="flex-1 px-4 py-3 bg-primary text-foreground rounded-xl hover:bg-primary-light transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changingPassword ? "Cambiando..." : "Guardar"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Usuarios</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary text-foreground px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Nuevo Usuario
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingUser ? "Editar Usuario" : "Nuevo Usuario"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Nombre
            </label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="correo@ejemplo.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {!editingUser && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Contraseña
              </label>
              <input
                type="password"
                placeholder="Contraseña"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              WhatsApp
            </label>
            <input
              type="text"
              placeholder="+57 3201112233"
              value={formData.whatsapp}
              onChange={(e) =>
                setFormData({ ...formData, whatsapp: e.target.value })
              }
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-foreground px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              {editingUser ? "Guardar Cambios" : "Crear Usuario"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-6 py-3 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {showSendCreds && (
        <Modal
          isOpen={showSendCreds}
          onClose={() => setShowSendCreds(false)}
          title="Enviar Credenciales"
          size="sm"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-400"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </div>
            <p className="text-foreground font-medium">
              ¿Enviar credenciales por WhatsApp?
            </p>
            <p className="text-muted-foreground text-sm">
              Se enviarán el email y contraseña al número registrado
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSendCreds(false)}
                className="flex-1 px-4 py-3 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
              >
                Ahora no
              </button>
              <button
                onClick={sendCredentials}
                className="flex-1 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors font-medium"
              >
                Enviar
              </button>
            </div>
          </div>
        </Modal>
      )}

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted to-card border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Servicios
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300"
                >
                  <td className="px-6 py-4">
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-foreground font-semibold">
                        {user.name}
                      </span>
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    {user.whatsapp ? (
                      <a
                        href={`https://wa.me/${user.whatsapp.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm font-medium transition-all"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => viewUserDetails(user)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 font-medium text-sm transition-all"
                    >
                      {user.service_count || 0} servicios
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleUserStatus(user)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${user.status === "active" ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"}`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full transition-all duration-300 ${user.status === "active" ? "translate-x-6 bg-green-400" : "translate-x-1 bg-red-400"}`}
                      />
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col items-end gap-2 sm:gap-2 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        {isAdmin &&
                          (user.user_services || []).some(
                            (s) => s.owner !== 1,
                          ) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openUserPayments(user);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-foreground font-medium text-sm transition-all"
                            >
                              Pagos
                            </button>
                          )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPasswordUser(user);
                            setShowPasswordModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500 text-yellow-400 hover:text-foreground font-medium text-sm transition-all"
                        >
                          Cambiar Pass
                        </button>
                        <button
                          onClick={() => handleEdit(user)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-foreground font-medium text-sm transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-foreground font-medium text-sm transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showUserPaymentsModal && (
        <Modal
          isOpen={showUserPaymentsModal}
          onClose={() => {
            setShowUserPaymentsModal(false);
            setPaymentsForUser([]);
            setUserServicesForPayments([]);
            setPaymentsUser(null);
            setPaymentForm({
              service_id: "",
              amount: "",
              payment_date: "",
              payment_method: "transferencia",
            });
          }}
          title={`Pagos - ${paymentsUser?.name || "Usuario"}`}
          size="lg"
        >
          <div className="space-y-4">
            <form onSubmit={handleRegisterPayment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Servicio (opcional)
                  </label>
                  <select
                    value={paymentForm.service_id}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        service_id: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
                  >
                    <option value="">Sin asignar</option>
                    {userServicesForPayments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.services?.name}{" "}
                        {s.url_dominio ? `(${s.url_dominio})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Monto
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={paymentForm.payment_date}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        payment_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={registeringPayment}
                  className="flex-1 bg-primary text-foreground px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
                >
                  {registeringPayment ? "Registrando..." : "Registrar Pago"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserPaymentsModal(false);
                    setPaymentForm({
                      service_id: "",
                      amount: "",
                      payment_date: "",
                      payment_method: "transferencia",
                    });
                    setPaymentsUser(null);
                  }}
                  className="flex-1 px-6 py-3 border border-border rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>

            <div>
              {loadingUserPayments ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : paymentsForUser.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No hay pagos registrados
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">
                          Servicio
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">
                          Monto
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">
                          Fecha
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">
                          Estado
                        </th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-dark">
                      {paymentsForUser.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3">
                            {p.user_services?.name ||
                              p.user_services?.services?.name ||
                              "-"}
                            {p.user_services?.url_dominio && (
                              <div className="text-xs text-muted-foreground">
                                {p.user_services.url_dominio}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {formatCurrency(p.amount || 0)}
                          </td>
                          <td className="px-4 py-3">
                            {formatDate(p.payment_date)}
                          </td>
                          <td className="px-4 py-3">{p.status}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {p.user_services?.owner === 0 &&
                                p.status !== "paid" && (
                                  <button
                                    onClick={() =>
                                      handleMarkPaymentPaidUser(p.id)
                                    }
                                    className="px-3 py-1.5 rounded-xl bg-green-500/10 hover:bg-green-500 text-green-400 hover:text-foreground text-sm font-medium"
                                  >
                                    Marcar Pagado
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
