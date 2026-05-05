import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import Modal from "../../components/Modal";

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
  });

  useEffect(() => {
    fetchServices();
  }, []);

  async function fetchServices() {
    const { data } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    setServices(data || []);
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      name: formData.name,
      description: formData.description,
      price: formData.price ? parseFloat(formData.price) : null,
    };

    if (editingService) {
      await supabase
        .from("services")
        .update(payload)
        .eq("id", editingService.id);
    } else {
      await supabase.from("services").insert(payload);
    }

    fetchServices();
    resetForm();
  }

  function resetForm() {
    setShowForm(false);
    setEditingService(null);
    setFormData({ name: "", description: "", price: "" });
  }

  function handleEdit(service) {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      price: service.price || "",
    });
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return;
    await supabase.from("services").delete().eq("id", id);
    fetchServices();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#287a70]">Servicios</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#287a70] text-white px-4 py-2 rounded-xl hover:bg-primary-light transition-colors"
        >
          + Nuevo Servicio
        </button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={resetForm}
        title={editingService ? "Editar Servicio" : "Nuevo Servicio"}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del servicio</label>
            <input
              type="text"
              placeholder="Nombre del servicio"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Precio (opcional)</label>
            <input
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
            <textarea
              placeholder="Descripción del servicio"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 bg-primary text-white px-6 py-3 rounded-xl hover:bg-primary-light transition-colors font-medium"
            >
              {editingService ? "Guardar Cambios" : "Crear Servicio"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 px-6 py-3 border border-border-dark rounded-xl text-gray-400 hover:bg-card-hover hover:text-white transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
                {editingService ? "Guardar" : "Crear"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-3 border border-border-dark rounded-xl text-gray-400 hover:bg-card-hover hover:text-[#1b524b] transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-card-bg rounded-2xl border border-border-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-sidebar-bg to-card-bg border-b border-border-dark">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark">
              {services.map((service) => (
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
                      <span className="text-[#1b524b] font-semibold">
                        {service.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">
                    {service.description || "-"}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold">
                      ${service.price || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(service)}
                        className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-[#1b524b] font-medium text-sm transition-all"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-[#1b524b] font-medium text-sm transition-all"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
