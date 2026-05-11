import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { formatDate, getDaysRemaining } from "../utils/dateUtils";
import {
  normalizeWhatsapp,
  formatWhatsapp,
  formatCurrency,
} from "../utils/formatUtils";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deriva el estado visual de un servicio a partir de su fecha de vencimiento,
 * en lugar de depender únicamente del campo `status` de la BD.
 * Esto evita inconsistencias entre el estado real y el almacenado.
 */
function getServiceStatus(service) {
  const days = getDaysRemaining(service.expires_at);
  if (days === null) return "pending";
  if (days < 0) return "expired";
  if (days <= 5) return "warning";
  return "active";
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, profile, refreshProfile } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ whatsapp: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ── Fetch de datos del usuario ──────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user) return;

    setFetchError(null);

    try {
      const { data: servicesData, error: servicesError } = await supabase
        .from("user_services")
        .select("*, services(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (servicesError) throw servicesError;

      setServices(servicesData ?? []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
      setFetchError("No se pudo cargar la información. Intenta recargar.");
    } finally {
      // siempre se ejecuta, evitando el spinner infinito ante errores
      setLoading(false);
    }
  }, [user]);

  // ── Fetch de configuración global (sin dependencia de `user`) ───────────

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "whatsapp_support")
        .single();

      if (error) throw error;
      if (data) setWhatsappNumber(data.value);
    } catch (err) {
      console.error("Error al cargar configuración:", err);
    }
  }, []);

  // efectos separados: fetchData depende del usuario, fetchSettings no
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Sincronizar formulario con el perfil cargado ─────────────────────────

  useEffect(() => {
    if (profile) {
      setEditForm({
        whatsapp: profile.whatsapp ?? "",
        email: profile.email ?? "",
      });
    }
  }, [profile]);

  // ── Actualizar perfil ────────────────────────────────────────────────────

  async function handleUpdateProfile(e) {
    e.preventDefault();

    // validación mínima antes de enviar
    if (!editForm.email && !editForm.whatsapp) return;

    setSavingProfile(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          whatsapp: normalizeWhatsapp(editForm.whatsapp),
          email: editForm.email.trim(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setShowEditModal(false);

      // refrescar tanto los servicios/pagos como el perfil en el contexto de auth
      await Promise.all([fetchData(), refreshProfile?.()]);
    } catch (err) {
      console.error("Error al actualizar perfil:", err);
    } finally {
      setSavingProfile(false);
    }
  }

  // ── Renovar servicio vía WhatsApp ────────────────────────────────────────

  function handleRenew(service) {
    const message = encodeURIComponent(
      `Hola, quiero renovar mi servicio: ${service.services?.name}`,
    );
    const wa = normalizeWhatsapp(whatsappNumber || "3167195500");
    window.open(`https://wa.me/${wa}?text=${message}`, "_blank");
  }

  // ── Número de soporte normalizado ────────────────────────────────────────
  const supportWa = normalizeWhatsapp(whatsappNumber || "3167195500");

  // ── Estados de carga ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-red-400 text-sm">{fetchError}</p>
      </div>
    );
  }

  // ── Cuenta suspendida ────────────────────────────────────────────────────

  if (profile?.status === "suspended") {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/30">
            <svg
              className="w-16 h-16 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">
            Cuenta Suspendida
          </h1>
          <p className="text-gray-400 mb-8">
            Tu cuenta ha sido suspendida. Contacta al administrador para más
            información.
          </p>
          <a
            href={`https://wa.me/${supportWa}?text=${encodeURIComponent("Hola, mi cuenta aparece suspendida. Necesito ayuda.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-semibold text-lg transition-all transform hover:scale-105"
          >
            <WhatsAppIcon className="w-6 h-6" />
            Contactar soporte
          </a>
        </div>
      </div>
    );
  }

  // ── Contadores usando estado derivado (consistente con el badge visual) ──

  const serviceCounts = services.reduce(
    (acc, s) => {
      const status = getServiceStatus(s);
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    },
    { active: 0, pending: 0, expired: 0, warning: 0 },
  );

  // ── Dominios registrados en todos los servicios del usuario ─────────────
  const dominios =
    [...new Set(services.map((s) => s.url_dominio).filter(Boolean))].join(
      ", ",
    ) || "No registrado";

  // ── Render principal ─────────────────────────────────────────────────────

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Columna izquierda ─────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Mis Servicios */}
          <Card titulo="Mis Servicios" icon={<BoxIcon />}>
            {services.length === 0 ? (
              <EmptyState
                icon={<BoxIcon className="w-8 h-8 text-primary" />}
                title="No tienes servicios contratados"
                subtitle="Contacta al administrador para agregar servicios"
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => {
                  const status = getServiceStatus(service);
                  const days = getDaysRemaining(service.expires_at);

                  return (
                    <div
                      key={service.id}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-card to-muted border border-border p-5 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-colors" />

                      <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <StatusBadge status={status} />
                            {service.owner === 0 && (
                              <span className="px-2 py-1 text-xs rounded-md bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                Lo administro
                              </span>
                            )}
                            {service.owner === 1 && (
                              <span className="px-2 py-1 text-xs rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                Cliente paga
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-lg mb-1">
                            {service.services?.name}
                          </h3>
                          <p className="text-sm text-gray-400 line-clamp-2">
                            {service.services?.description}
                          </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
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
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500">
                            Precio mensual
                          </p>
                          <p className="text-xl font-bold text-primary">
                            {formatCurrency(service.price ?? 0)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRenew(service)}
                          className="px-4 py-3 bg-primary/20 hover:bg-primary text-primary hover:text-white rounded-xl font-medium text-sm transition-all"
                            >
                              Renovar
                            </button>
                      </div>

                      {service.expires_at && (
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
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
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Vence: {formatDate(service.expires_at)}
                          </div>
                          <DaysLabel days={days} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* ── Columna derecha ───────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Información */}
          <Card
            titulo="Información"
            icon={
              <svg
                className="w-6 h-6"
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
            }
          >
            <div className="space-y-3">
              <InfoItem
                label="Dominio"
                value={dominios}
                icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                color="blue"
              />
              <InfoItem
                label="WhatsApp"
                value={formatWhatsapp(profile?.whatsapp) || "No registrado"}
                icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                color="green"
                href={
                  profile?.whatsapp
                    ? `https://wa.me/${normalizeWhatsapp(profile.whatsapp)}`
                    : null
                }
              />
              <InfoItem
                label="Email"
                value={profile?.email || "No registrado"}
                icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                color="purple"
                href={profile?.email ? `mailto:${profile.email}` : null}
              />
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 hover:border-primary/40 transition-all group w-full text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-primary/70 font-medium">
                    Acciones
                  </p>
                  <p className="text-sm font-semibold text-primary">
                    Editar perfil
                  </p>
                </div>
                <svg
                  className="w-5 h-5 text-primary/50 group-hover:text-primary transition-colors"
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
              </button>
            </div>
          </Card>

          {/* Estado de Cuenta — usa contadores derivados del estado visual */}
          <Card
            titulo="Estado de Cuenta"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            }
          >
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 text-center border border-primary/20">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/10 rounded-full blur-xl" />
              <p className="text-gray-400 text-sm mb-2">Servicios Activos</p>
              <p className="text-4xl lg:text-5xl font-bold text-primary">
                {serviceCounts.active + serviceCounts.warning}
              </p>
              <p className="text-primary/60 text-sm mt-2">
                de {services.length} total
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 p-4 text-center border border-yellow-500/20">
              <p className="text-xl lg:text-2xl font-bold text-yellow-400">
                {serviceCounts.warning}
              </p>
                <p className="text-xs text-yellow-400/70">Pendientes</p>
              </div>
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 p-4 text-center border border-red-500/20">
              <p className="text-xl lg:text-2xl font-bold text-red-400">
                {serviceCounts.expired}
              </p>
                <p className="text-xs text-red-400/70">Vencidos</p>
              </div>
            </div>
          </Card>

          {/* Soporte */}
          <Card
            titulo="Soporte"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            }
          >
            <div className="space-y-4">
              <a
                href={`https://wa.me/${supportWa}?text=${encodeURIComponent("Hola, necesito soporte técnico")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20 hover:border-green-500/40 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <WhatsAppIcon className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-400/70 font-medium">
                    WhatsApp
                  </p>
                  <p className="text-sm font-semibold text-white">
                    Soporte técnico
                  </p>
                </div>
                <ArrowIcon className="w-5 h-5 text-green-400 group-hover:translate-x-1 transition-transform" />
              </a>

              <a
                href="mailto:info@nilspineda.com?subject=Soporte%20técnico"
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
                  <p className="text-xs text-blue-400/70 font-medium">Email</p>
                  <p className="text-sm font-semibold text-white">
                    info@nilspineda.com
                  </p>
                </div>
                <ArrowIcon className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Modal Editar Perfil ──────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Editar Perfil</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Se usa onSubmit en el form; los inputs usan onChange normalmente */}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={editForm.whatsapp}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, whatsapp: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  placeholder="3012345678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, email: e.target.value }))
                  }
                  className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-white placeholder-gray-500 focus:border-primary focus:outline-none transition-colors"
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <button
                type="submit"
                disabled={
                  savingProfile || (!editForm.email && !editForm.whatsapp)
                }
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingProfile ? "Guardando..." : "Guardar cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function Card({ titulo, children, className = "", icon }) {
  return (
    <div
      className={`relative overflow-hidden bg-card rounded-3xl border border-border ${className}`}
    >
      {titulo && (
        <div className="flex items-center gap-3 p-5 lg:p-6 border-b border-border">
          {icon && (
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              {icon}
            </div>
          )}
          <h2 className="text-lg font-bold text-white">{titulo}</h2>
        </div>
      )}
      <div className="p-5 lg:p-6">{children}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    active: {
      style:
        "bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 border border-green-500/30",
      label: "Activo",
    },
    pending: {
      style:
        "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30",
      label: "Pendiente",
    },
    expired: {
      style:
        "bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30",
      label: "Vencido",
    },
    warning: {
      style:
        "bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-400 border border-orange-500/30",
      label: "Por Vencer",
    },
  };
  const { style, label } = map[status] ?? map.pending;
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${style}`}>
      {label}
    </span>
  );
}

function InfoItem({ label, value, icon, color, href }) {
  const colorMap = {
    blue: { bg: "bg-blue-500/20", text: "text-blue-400" },
    green: { bg: "bg-green-500/20", text: "text-green-400" },
    purple: { bg: "bg-purple-500/20", text: "text-purple-400" },
  };
  const { bg, text } = colorMap[color] ?? colorMap.blue;

  const inner = (
    <div
      className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-card to-muted border border-border hover:border-primary/30 transition-all duration-300 group ${href ? "cursor-pointer" : ""}`}
    >
      <div
        className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
      >
        <svg
          className={`w-6 h-6 ${text}`}
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
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
      {href && (
        <svg
          className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      )}
    </div>
  );

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    inner
  );
}

/** Etiqueta de días restantes/vencidos para una tarjeta de servicio */
function DaysLabel({ days }) {
  if (days === null) return null;
  if (days < 0)
    return (
      <span className="text-xs text-red-400 font-medium">
        {Math.abs(days)} días vencido
      </span>
    );
  if (days <= 5)
    return (
      <span className="text-xs text-orange-400 font-medium">
        {days} días restantes
      </span>
    );
  return (
    <span className="text-xs text-green-400 font-medium">{days} días</span>
  );
}

/** Estado vacío reutilizable */
function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
        {icon}
      </div>
      <p className="text-gray-400 font-medium">{title}</p>
      {subtitle && <p className="text-gray-500 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Iconos reutilizables ────────────────────────────────────────────────────

function BoxIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  );
}

function WhatsAppIcon({ className = "w-6 h-6" }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.124 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function ArrowIcon({ className = "w-5 h-5" }) {
  return (
    <svg
      className={className}
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
  );
}
