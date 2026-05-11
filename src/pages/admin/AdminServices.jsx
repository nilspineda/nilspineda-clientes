import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { notify } from "../../utils/notify";
import Modal from "../../components/Modal";

const SERVICE_TYPES = [
  { value: "dominio", label: "Dominio", color: "bg-blue-500/20 text-blue-400" },
  {
    value: "hosting",
    label: "Hosting",
    color: "bg-purple-500/20 text-purple-400",
  },
  {
    value: "correo",
    label: "Correo",
    color: "bg-yellow-500/20 text-yellow-400",
  },
  {
    value: "membresia",
    label: "Membresía",
    color: "bg-green-500/20 text-green-400",
  },
  {
    value: "personalizado",
    label: "Personalizado",
    color: "bg-gray-500/20 text-gray-400",
  },
];

function getTypeInfo(type) {
  return SERVICE_TYPES.find((t) => t.value === type) || SERVICE_TYPES[4];
}

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceUsage, setServiceUsage] = useState({});
  const [formData, setFormData] = useState({
    name: "",
    type: "dominio",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const [servicesRes, usageRes] = await Promise.all([
      supabase
        .from("services")
        .select("id, name, price, type, description, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_services").select("service_id"),
    ]);

    const counts = {};
    (usageRes.data || []).forEach((s) => {
      if (s.service_id) counts[s.service_id] = (counts[s.service_id] || 0) + 1;
    });
    setServiceUsage(counts);

    setServices(servicesRes.data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.name || formData.name.trim() === "") {
      notify("El nombre del servicio es requerido", "error");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        type: formData.type,
      };

      if (editingService) {
        const { error } = await supabase
          .from("services")
          .update(payload)
          .eq("id", editingService.id);
        if (error) throw error;
        notify("Servicio actualizado correctamente", "success");
      } else {
        const { error } = await supabase.from("services").insert(payload);
        if (error) throw error;
        notify("Servicio creado correctamente", "success");
      }

      fetchServices();
      resetForm();
    } catch (error) {
      console.error("Error guardando servicio:", error);
      notify("Error al guardar servicio: " + error.message, "error");
    }
  }

  function resetForm() {
    setShowModal(false);
    setEditingService(null);
    setFormData({ name: "", type: "dominio" });
  }

  function handleEdit(service) {
    setEditingService(service);
    setFormData({
      name: service.name,
      type: service.type || "dominio",
    });
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      fetchServices();
      notify("Servicio eliminado correctamente", "success");
    } catch (error) {
      console.error("Error eliminando servicio:", error);
      notify("Error al eliminar servicio", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const filteredServices = services.filter(
    (s) =>
      !searchTerm ||
      s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Servicios Base
            </h1>
            <p className="text-sm text-muted-foreground">
              {filteredServices.length} servicios
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary text-foreground px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Nuevo Servicio
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border p-4">
        <input
          type="text"
          placeholder="Buscar servicios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:w-64 px-4 py-2 bg-muted border border-border rounded-xl text-foreground placeholder-muted-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
        />
      </div>

      <Modal
        isOpen={showModal}
        onClose={resetForm}
        title={editingService ? "Editar Servicio" : "Nuevo Servicio"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Nombre del servicio
            </label>
            <input
              type="text"
              placeholder="Ej: Hosting Basic, Dominio .com"
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
              Tipo de servicio
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-foreground focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-foreground px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              {editingService ? "Guardar Cambios" : "Crear Servicio"}
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
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Clientes
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {services.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No hay servicios creados. Haz clic en "Nuevo Servicio" para
                    comenzar.
                  </td>
                </tr>
              ) : (
                services.map((service) => {
                  const typeInfo = getTypeInfo(service.type);
                  return (
                    <tr
                      key={service.id}
                      className="group hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent transition-all duration-300"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
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
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                              />
                            </svg>
                          </div>
                          <span className="text-foreground font-semibold">
                            {service.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${typeInfo.color}`}
                        >
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1.5 rounded-lg bg-gray-500/10 text-gray-400 font-medium text-sm">
                          {serviceUsage[service.id] || 0} clientes
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(service)}
                            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-foreground font-medium text-sm transition-all"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-foreground font-medium text-sm transition-all"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
