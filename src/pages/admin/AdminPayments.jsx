import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { normalizeWhatsapp } from "../../utils/formatUtils";
import { notify } from "../../utils/notify";
import { formatDate } from "../../utils/dateUtils";
import Modal from "../../components/Modal";

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [users, setUsers] = useState([]);
  const [userServices, setUserServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchClient, setSearchClient] = useState("");
  const [formData, setFormData] = useState({
    user_id: "",
    service_id: "",
    amount: "",
    payment_date: "",
    payment_method: "transferencia",
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const [paymentsRes, usersRes, userServicesRes] = await Promise.all([
      supabase
        .from("payments")
        .select("*, user_services(name, url_dominio), profiles(name, whatsapp)")
        .order("payment_date", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, name")
        .order("name", { ascending: true }),
      supabase
        .from("user_services")
        .select("id, name, url_dominio, user_id, services(name)")
        .order("created_at", { ascending: false }),
    ]);

    setPayments(paymentsRes.data || []);
    setUsers(usersRes.data || []);
    setUserServices(userServicesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const payload = {
        user_id: formData.user_id,
        service_id: formData.service_id || null,
        amount: parseFloat(formData.amount),
        payment_date: formData.payment_date || new Date().toISOString(),
        payment_method: formData.payment_method,
        status: "paid",
      };

      if (editingPayment) {
        const { error } = await supabase
          .from("payments")
          .update(payload)
          .eq("id", editingPayment.id);
        if (error) throw error;
        notify("Pago actualizado correctamente", "success");
      } else {
        const { error } = await supabase.from("payments").insert(payload);
        if (error) throw error;
        notify("Pago registrado correctamente", "success");
      }

      fetchData();
      resetForm();
    } catch (error) {
      console.error("Error guardando pago:", error);
      notify("Error al guardar pago: " + error.message, "error");
    }
  }

  function resetForm() {
    setShowModal(false);
    setEditingPayment(null);
    setFormData({
      user_id: "",
      service_id: "",
      amount: "",
      payment_date: "",
      payment_method: "transferencia",
    });
  }

  function handleEdit(payment) {
    setEditingPayment(payment);
    setFormData({
      user_id: payment.user_id,
      service_id: payment.service_id || "",
      amount: payment.amount || "",
      payment_date: payment.payment_date
        ? payment.payment_date.split("T")[0]
        : "",
      payment_method: payment.payment_method || "transferencia",
    });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;
    try {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
      fetchData();
      notify("Pago eliminado correctamente", "success");
    } catch (error) {
      console.error("Error eliminando pago:", error);
      notify("Error al eliminar pago", "error");
    }
  }

  async function updateStatus(paymentId, newStatus) {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status: newStatus })
        .eq("id", paymentId);
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error("Error actualizando estado:", error);
    }
  }

  const filteredPayments = payments.filter((p) => {
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    const matchDateFrom =
      !dateFrom || new Date(p.payment_date) >= new Date(dateFrom);
    const matchDateTo =
      !dateTo || new Date(p.payment_date) <= new Date(dateTo + "T23:59:59");
    const matchSearch =
      !searchClient ||
      p.profiles?.name?.toLowerCase().includes(searchClient.toLowerCase());
    return matchStatus && matchDateFrom && matchDateTo && matchSearch;
  });

  const getServicesForUser = (userId) => {
    return userServices.filter((s) => s.user_id === userId);
  };

  const totalAmount = filteredPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const monthlyStats = () => {
    const now = new Date();
    const thisMonth = payments.filter((p) => {
      const d = new Date(p.payment_date);
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear() &&
        p.status === "paid"
      );
    });
    const lastMonth = payments.filter((p) => {
      const d = new Date(p.payment_date);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return (
        d.getMonth() === lm.getMonth() &&
        d.getFullYear() === lm.getFullYear() &&
        p.status === "paid"
      );
    });
    return {
      thisMonth: thisMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      lastMonth: lastMonth.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0),
      count: thisMonth.length,
    };
  };

  function exportCSV() {
    const headers = [
      "Cliente",
      "Servicio",
      "Monto",
      "Fecha",
      "Método",
      "Estado",
    ];
    const rows = filteredPayments.map((p) => [
      p.profiles?.name || "-",
      p.user_services?.name || "-",
      p.amount,
      formatDate(p.payment_date),
      p.payment_method,
      p.status,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pagos_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats = monthlyStats();
  const currentMonth = new Date().toLocaleDateString("es-CO", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-green-400"
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
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Pagos</h1>
            <p className="text-sm text-muted-foreground">
              Total filtrado: ${totalAmount.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="bg-muted text-foreground px-4 py-2 rounded-xl hover:bg-muted/80 transition-colors flex items-center gap-2"
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Exportar CSV
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-foreground px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
          >
            + Registrar Pago
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">{currentMonth}</p>
          <p className="text-3xl font-bold text-green-400">
            ${stats.thisMonth.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Mes anterior</p>
          <p className="text-3xl font-bold text-foreground">
            ${stats.lastMonth.toLocaleString()}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">Pagos este mes</p>
          <p className="text-3xl font-bold text-foreground">{stats.count}</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={searchClient}
            onChange={(e) => setSearchClient(e.target.value)}
            className="px-4 py-2 bg-muted border border-border rounded-xl text-foreground text-sm w-48"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-muted border border-border rounded-xl text-foreground text-sm"
          >
            <option value="all">Todos los estados</option>
            <option value="paid">Pagado</option>
            <option value="pending">Pendiente</option>
            <option value="failed">Fallido</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Desde:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Hasta:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 bg-muted border border-border rounded-xl text-foreground text-sm"
            />
          </div>
          {(filterStatus !== "all" || dateFrom || dateTo) && (
            <button
              onClick={() => {
                setFilterStatus("all");
                setDateFrom("");
                setDateTo("");
              }}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingPayment ? "Editar Pago" : "Registrar Pago"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Cliente
            </label>
            <select
              value={formData.user_id}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  user_id: e.target.value,
                  service_id: "",
                });
              }}
              required
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="">Seleccionar cliente</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {formData.user_id && (
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Servicio (opcional)
              </label>
              <select
                value={formData.service_id}
                onChange={(e) =>
                  setFormData({ ...formData, service_id: e.target.value })
                }
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              >
                <option value="">Sin asignar a servicio</option>
                {getServicesForUser(formData.user_id).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name || s.services?.name}{" "}
                    {s.url_dominio ? `(${s.url_dominio})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Monto
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                }
                required
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Fecha
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
                className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Método de pago
            </label>
            <select
              value={formData.payment_method}
              onChange={(e) =>
                setFormData({ ...formData, payment_method: e.target.value })
              }
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="mercadopago">MercadoPago</option>
              <option value="nequi">Nequi</option>
              <option value="daviplata">Daviplata</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-foreground px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              {editingPayment ? "Guardar Cambios" : "Registrar Pago"}
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-muted to-card border-b border-border">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Servicio
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Monto
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Método
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
              {filteredPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No hay pagos registrados.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {payment.profiles?.whatsapp && (
                          <a
                            href={`https://wa.me/${normalizeWhatsapp(payment.profiles.whatsapp)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center hover:bg-green-500/30 transition-colors"
                          >
                            <svg
                              className="w-4 h-4 text-green-400"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          </a>
                        )}
                        <span className="font-semibold text-foreground">
                          {payment.profiles?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {payment.user_services?.name ||
                        payment.user_services?.services?.name ||
                        "-"}
                      {payment.user_services?.url_dominio && (
                        <span className="block text-xs text-blue-400">
                          {payment.user_services.url_dominio}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
                        ${payment.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-sm">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-lg text-xs bg-muted text-muted-foreground capitalize">
                        {payment.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={payment.status}
                        onChange={(e) =>
                          updateStatus(payment.id, e.target.value)
                        }
                        className={`text-sm border rounded-lg px-3 py-1.5 ${
                          payment.status === "paid"
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : payment.status === "pending"
                              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                              : "bg-red-500/10 border-red-500/30 text-red-400"
                        }`}
                      >
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="failed">Fallido</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-foreground font-medium text-sm transition-all"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-foreground font-medium text-sm transition-all"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
