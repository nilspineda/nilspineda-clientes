import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import {
  normalizeUrl,
  normalizeWhatsapp,
  formatCurrency,
} from "../../utils/formatUtils";
import { formatDate } from "../../utils/dateUtils";
import Modal from "../../components/Modal";

function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null;
  const today = new Date();
  const expires = new Date(expiresAt);
  const diff = Math.ceil((expires - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getPaymentStatus(expiresAt) {
  const days = getDaysRemaining(expiresAt);
  if (days === null) return { label: "Sin fecha", color: "gray", urgency: 0 };
  if (days < 0) return { label: "Vencido", color: "red", urgency: 3 };
  if (days <= 20) return { label: "Por Vencer", color: "orange", urgency: 2 };
  return { label: "Al día", color: "green", urgency: 1 };
}

export default function AdminIndex() {
  const [stats, setStats] = useState({
    users: 0,
    services: 0,
    activeServices: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showNewUser, setShowNewUser] = useState(false);
  const [showNewService, setShowNewService] = useState(false);
  const [showNewPayment, setShowNewPayment] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientPayments, setClientPayments] = useState([]);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    whatsapp: "",
  });
  const [serviceForm, setServiceForm] = useState({
    name: "",
    price: "",
    owner: 0,
  });
  const [paymentForm, setPaymentForm] = useState({
    user_id: "",
    service_id: "",
    amount: "",
    payment_date: "",
    payment_method: "transfer",
  });
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [upcomingRenewals, setUpcomingRenewals] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterService, setFilterService] = useState("all");
  const [activeTab, setActiveTab] = useState("renewals");
  const [clientModalTab, setClientModalTab] = useState("details");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStats();
    fetchDataForForms();
  }, []);

  async function fetchStats() {
    const [usersRes, servicesRes, userServicesRes, paymentsRes] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
        supabase.from("user_services").select("id").eq("status", "active"),
        supabase.from("payments").select("amount").eq("status", "paid"),
      ]);
    const totalRevenue =
      paymentsRes.data?.reduce(
        (sum, p) => sum + (parseFloat(p.amount) || 0),
        0,
      ) || 0;
    setStats({
      users: usersRes.count || 0,
      services: servicesRes.count || 0,
      activeServices: userServicesRes.data?.length || 0,
      totalRevenue,
    });

    const now = new Date();
    const twentyDaysLater = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
    const { data: renewals } = await supabase
      .from("user_services")
      .select("*, services(name, type), profiles(id, name, whatsapp)")
      .not("expires_at", "is", null)
      .gte("expires_at", now.toISOString())
      .lte("expires_at", twentyDaysLater.toISOString())
      .order("expires_at", { ascending: true });
    setUpcomingRenewals(renewals || []);

    const { data: all } = await supabase
      .from("user_services")
      .select("*, services(name, type), profiles(id, name, whatsapp)")
      .order("expires_at", { ascending: true });
    setAllServices(all || []);
    setLoading(false);
  }

  async function openClientModal(client) {
    setSelectedClient(client);
    setShowClientModal(true);
    fetchClientPayments(client.id);
  }

  async function fetchClientPayments(clientId) {
    const { data } = await supabase
      .from("payments")
      .select("*, services(name)")
      .eq("user_id", clientId)
      .order("payment_date", { ascending: false });
    setClientPayments(data || []);
  }

  function getTypeBadge(type) {
    const colors = {
      dominio: "bg-blue-500/20 text-blue-400",
      hosting: "bg-purple-500/20 text-purple-400",
      correo: "bg-yellow-500/20 text-yellow-400",
      membresia: "bg-green-500/20 text-green-400",
      default: "bg-gray-500/20 text-gray-400",
    };
    return colors[type] || colors.default;
  }

  function getTypeLabel(type) {
    const labels = {
      dominio: "Dominio",
      hosting: "Hosting",
      correo: "Correo",
      membresia: "Membresía",
    };
    return labels[type] || type || "Servicio";
  }

  const filteredServices = allServices.filter((s) => {
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchType = filterService === "all" || s.service_id === filterService;
    const matchSearch =
      !searchTerm ||
      s.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.services?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchType && matchSearch;
  });

  const clientServiceCounts = {};
  allServices.forEach((s) => {
    if (!clientServiceCounts[s.user_id]) {
      clientServiceCounts[s.user_id] = { active: 0, pending: 0, suspended: 0 };
    }
    if (s.status === "active") clientServiceCounts[s.user_id].active++;
    else if (s.status === "pending") clientServiceCounts[s.user_id].pending++;
    else if (s.status === "suspended")
      clientServiceCounts[s.user_id].suspended++;
  });

  async function fetchDataForForms() {
    const [usersRes, servicesRes] = await Promise.all([
      supabase.from("profiles").select("id, name"),
      supabase.from("services").select("id, name, type"),
    ]);
    setUsers(usersRes.data || []);
    setServices(servicesRes.data || []);
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    const { data, error } = await supabase.auth.signUp({
      email: userForm.email,
      password: userForm.password,
      options: { data: { name: userForm.name } },
    });
    if (!error && data.user) {
      const normalizedWhatsapp = normalizeWhatsapp(userForm.whatsapp);
      await supabase
        .from("profiles")
        .update({ whatsapp: normalizedWhatsapp })
        .eq("id", data.user.id);
      setShowNewUser(false);
      setUserForm({
        name: "",
        email: "",
        password: "",
        whatsapp: "",
      });
      fetchStats();
      fetchDataForForms();
    }
  }

  async function handleCreateService(e) {
    e.preventDefault();
    await supabase.from("services").insert({
      name: serviceForm.name,
      price: serviceForm.price ? parseFloat(serviceForm.price) : null,
      owner: serviceForm.owner,
    });
    setShowNewService(false);
    setServiceForm({ name: "", price: "", owner: 0 });
    fetchStats();
    fetchDataForForms();
  }

  async function handleCreatePayment(e) {
    e.preventDefault();
    await supabase.from("payments").insert({
      user_id: paymentForm.user_id,
      service_id: paymentForm.service_id,
      amount: paymentForm.amount ? parseFloat(paymentForm.amount) : null,
      payment_date: paymentForm.payment_date || new Date().toISOString(),
      payment_method: paymentForm.payment_method,
      status: "paid",
    });
    setShowNewPayment(false);
    setPaymentForm({
      user_id: "",
      service_id: "",
      amount: "",
      payment_date: "",
      payment_method: "transfer",
    });
    fetchStats();
  }

  const allUserServices = allServices;

  const filteredServicesList = allUserServices.filter((item) => {
    if (filterService !== "all" && item.service_id !== filterService)
      return false;

    if (filterStatus !== "all") {
      const status = getPaymentStatus(item.expires_at);
      if (filterStatus === "expired" && status.urgency !== 3) return false;
      if (filterStatus === "expiring" && status.urgency !== 2) return false;
      if (filterStatus === "active" && status.urgency !== 1) return false;
    }
    return true;
  });

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl lg:text-3xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Dashboard
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            Bienvenido al panel de administración
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <QuickActionBtn
          label="Nuevo Cliente"
          icon="M12 4v16m8-8H4"
          color="primary"
          onClick={() => setShowNewUser(true)}
        />
        <QuickActionBtn
          label="Nuevo Servicio"
          icon="M12 4v16m8-8H4"
          color="purple"
          onClick={() => setShowNewService(true)}
        />
        <QuickActionBtn
          label="Registrar Pago"
          icon="M12 4v16m8-8H4"
          color="green"
          onClick={() => setShowNewPayment(true)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Clientes"
          value={stats.users}
          color="blue"
          icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
        <StatCard
          title="Servicios Base"
          value={stats.services}
          color="purple"
          icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
        <StatCard
          title="Servicios Activos"
          value={stats.activeServices}
          color="green"
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <StatCard
          title="Ingresos Totales"
          value={formatCurrency(stats.totalRevenue)}
          color="yellow"
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </div>

      {/* Main Table Area */}
      <div className="card overflow-hidden">
        <div
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("renewals")}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${activeTab === "renewals" ? "border-primary text-primary" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            >
              Renovaciones Próximas
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`text-sm font-semibold pb-1 border-b-2 transition-colors ${activeTab === "all" ? "border-primary text-primary" : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
            >
              Todos los Servicios
            </button>
          </div>

          {activeTab === "all" && (
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input py-1.5 text-sm w-full sm:w-40"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input py-1.5 text-sm"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Al día</option>
                <option value="expiring">Por Vencer</option>
                <option value="expired">Vencidos</option>
              </select>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="input py-1.5 text-sm"
              >
                <option value="all">Cualquier Servicio</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: "var(--muted)" }}>
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Cliente
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Dominio
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Servicio
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Vencimiento
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Días
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Estado
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-semibold uppercase"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Precio
                </th>
              </tr>
            </thead>
            <tbody
              className="divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {(activeTab === "renewals"
                ? upcomingRenewals
                : filteredServicesList
              ).length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    No hay datos para mostrar
                  </td>
                </tr>
              ) : (
                (activeTab === "renewals"
                  ? upcomingRenewals
                  : filteredServicesList
                ).map((item) => {
                  const days = getDaysRemaining(item.expires_at);
                  const status = getPaymentStatus(item.expires_at);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-[var(--muted)] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openClientModal(item.profiles)}
                          className="flex items-center gap-2 hover:opacity-80 transition-opacity text-left"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                            style={{
                              background: "rgba(16, 185, 129, 0.1)",
                              color: "#10b981",
                            }}
                          >
                            {item.profiles?.name?.charAt(0).toUpperCase() ||
                              "U"}
                          </div>
                          <span
                            className="font-medium truncate"
                            style={{ color: "var(--foreground)" }}
                          >
                            {item.profiles?.name}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-1 rounded-lg text-xs"
                          style={{
                            background: "rgba(59, 130, 246, 0.1)",
                            color: "#3b82f6",
                          }}
                        >
                          {item.url_dominio || "-"}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.services?.name || "-"}
                      </td>
                      <td
                        className="px-4 py-3 text-sm"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {item.expires_at ? formatDate(item.expires_at) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="font-medium whitespace-nowrap"
                          style={{
                            color:
                              days < 0
                                ? "#ef4444"
                                : days <= 20
                                  ? "#f97316"
                                  : "#10b981",
                          }}
                        >
                          {days !== null
                            ? days < 0
                              ? `${Math.abs(days)} días vencido`
                              : `${days} días`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                            status.color === "green"
                              ? "bg-green-500/20 text-green-400"
                              : status.color === "orange"
                                ? "bg-orange-500/20 text-orange-400"
                                : status.color === "red"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 font-bold"
                        style={{ color: "#10b981" }}
                      >
                        {formatCurrency(item.price || 0)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Detail Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title="Detalles del Cliente"
        size="lg"
      >
        {selectedClient && (
          <div className="space-y-4">
            <div
              className="flex gap-4 border-b pb-2"
              style={{ borderColor: "var(--border)" }}
            >
              <button
                onClick={() => setClientModalTab("details")}
                className={`text-sm font-medium ${clientModalTab === "details" ? "text-primary" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                Información
              </button>
              <button
                onClick={() => setClientModalTab("services")}
                className={`text-sm font-medium ${clientModalTab === "services" ? "text-primary" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                Sus Servicios
              </button>
              <button
                onClick={() => setClientModalTab("payments")}
                className={`text-sm font-medium ${clientModalTab === "payments" ? "text-primary" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
              >
                Pagos
              </button>
            </div>

            {clientModalTab === "details" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="card p-4 bg-[var(--muted)]/50">
                    <p className="text-sm font-medium text-[var(--muted-foreground)] mb-1">
                      Nombre
                    </p>
                    <p className="font-semibold text-[var(--foreground)]">
                      {selectedClient.name || "-"}
                    </p>
                  </div>
                  <div className="card p-4 bg-[var(--muted)]/50">
                    <p className="text-sm font-medium text-[var(--muted-foreground)] mb-1">
                      Email
                    </p>
                    <p className="font-semibold text-[var(--foreground)] truncate">
                      {selectedClient.email || "-"}
                    </p>
                  </div>
                  <div className="card p-4 bg-[var(--muted)]/50">
                    <p className="text-sm font-medium text-[var(--muted-foreground)] mb-1">
                      WhatsApp
                    </p>
                    {selectedClient.whatsapp ? (
                      <a
                        href={`https://wa.me/${selectedClient.whatsapp.replace(/\D/g, "")}`}
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
                        {selectedClient.whatsapp}
                      </a>
                    ) : (
                      <p className="text-[var(--muted-foreground)]">-</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {clientModalTab === "services" && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {allServices.filter((s) => s.user_id === selectedClient.id)
                  .length === 0 ? (
                  <p className="text-center py-4 text-[var(--muted-foreground)] text-sm">
                    Este cliente no tiene servicios asignados.
                  </p>
                ) : (
                  allServices
                    .filter((s) => s.user_id === selectedClient.id)
                    .map((service) => {
                      const status = getPaymentStatus(service.expires_at);
                      return (
                        <div
                          key={service.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-[var(--muted)]/30"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div>
                            <p className="font-medium text-[var(--foreground)]">
                              {service.services?.name}
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                              {service.url_dominio || "Sin dominio"}
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                status.color === "green"
                                  ? "bg-green-500/20 text-green-400"
                                  : status.color === "orange"
                                    ? "bg-orange-500/20 text-orange-400"
                                    : status.color === "red"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {status.label}
                            </span>
                            <p className="text-xs font-semibold mt-1 text-[var(--foreground)]">
                              Vence:{" "}
                              {service.expires_at
                                ? formatDate(service.expires_at)
                                : "-"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {clientModalTab === "payments" && (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {clientPayments.length === 0 ? (
                  <p className="text-center py-4 text-[var(--muted-foreground)] text-sm">
                    Este cliente no tiene pagos registrados.
                  </p>
                ) : (
                  clientPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-[var(--muted)]/30"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {payment.services?.name || "Pago"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                            payment.status === "paid"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {payment.status === "paid" ? "Pagado" : "Pendiente"}
                        </span>
                        <p className="text-xs font-semibold mt-1 text-[var(--foreground)]">
                          {formatCurrency(payment.amount || 0)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setShowClientModal(false)}
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Other Modals (New User, Service, etc.) */}
      <Modal
        isOpen={showNewUser}
        onClose={() => setShowNewUser(false)}
        title="Nuevo Cliente"
        size="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Nombre
              </label>
              <input
                type="text"
                value={userForm.name}
                onChange={(e) =>
                  setUserForm({ ...userForm, name: e.target.value })
                }
                required
                className="input"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                required
                className="input"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
                required
                className="input"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                WhatsApp
              </label>
              <input
                type="text"
                value={userForm.whatsapp}
                onChange={(e) =>
                  setUserForm({ ...userForm, whatsapp: e.target.value })
                }
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn-primary">
              Crear Cliente
            </button>
            <button
              type="button"
              onClick={() => setShowNewUser(false)}
              className="flex-1 btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showNewService}
        onClose={() => setShowNewService(false)}
        title="Nuevo Servicio"
        size="md"
      >
        <form onSubmit={handleCreateService} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Nombre
            </label>
            <input
              type="text"
              value={serviceForm.name}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, name: e.target.value })
              }
              required
              className="input"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Precio de referencia
            </label>
            <input
              type="number"
              value={serviceForm.price}
              onChange={(e) =>
                setServiceForm({ ...serviceForm, price: e.target.value })
              }
              className="input"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              ¿Quién paga?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.owner === 0 ? "border-primary bg-primary/10" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
              >
                <input
                  type="radio"
                  name="owner"
                  value={0}
                  checked={serviceForm.owner === 0}
                  onChange={() => setServiceForm({ ...serviceForm, owner: 0 })}
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
                  className="font-medium"
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
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${serviceForm.owner === 1 ? "border-green-500 bg-green-500/10" : "border-[var(--border)] hover:bg-[var(--muted)]"}`}
              >
                <input
                  type="radio"
                  name="owner"
                  value={1}
                  checked={serviceForm.owner === 1}
                  onChange={() => setServiceForm({ ...serviceForm, owner: 1 })}
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
                  className="font-medium"
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
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn-primary">
              Crear Servicio
            </button>
            <button
              type="button"
              onClick={() => setShowNewService(false)}
              className="flex-1 btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={showNewPayment}
        onClose={() => setShowNewPayment(false)}
        title="Registrar Pago"
        size="md"
      >
        <form onSubmit={handleCreatePayment} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Cliente
            </label>
            <select
              value={paymentForm.user_id}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, user_id: e.target.value })
              }
              required
              className="input"
            >
              <option value="">Seleccionar cliente</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Servicio
            </label>
            <select
              value={paymentForm.service_id}
              onChange={(e) =>
                setPaymentForm({ ...paymentForm, service_id: e.target.value })
              }
              required
              className="input"
            >
              <option value="">Seleccionar servicio</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Monto
              </label>
              <input
                type="number"
                value={paymentForm.amount}
                onChange={(e) =>
                  setPaymentForm({ ...paymentForm, amount: e.target.value })
                }
                required
                className="input"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
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
                className="input"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 btn-primary">
              Registrar Pago
            </button>
            <button
              type="button"
              onClick={() => setShowNewPayment(false)}
              className="flex-1 btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function QuickActionBtn({ label, icon, color, onClick }) {
  const colors = {
    primary: "bg-primary/10 text-primary hover:bg-primary/20",
    purple: "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20",
    green: "bg-green-500/10 text-green-400 hover:bg-green-500/20",
    blue: "bg-blue-500/10 text-blue-400 hover:bg-blue-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${colors[color]}`}
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
          d={icon}
        />
      </svg>
      {label}
    </button>
  );
}

function StatCard({ title, value, color, icon }) {
  const colorClasses = {
    blue: { bg: "bg-blue-500/10", text: "text-blue-500" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500/10", text: "text-green-500" },
    yellow: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  };
  const style = colorClasses[color];
  return (
    <div className="card hover:border-primary/30 transition-colors p-5">
      <div
        className={`w-10 h-10 ${style.bg} rounded-xl flex items-center justify-center mb-3`}
      >
        <svg
          className={`w-5 h-5 ${style.text}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={icon}
          />
        </svg>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
        {title}
      </p>
    </div>
  );
}
