import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { supabase, getSupabaseAdmin } from "../lib/supabaseClient";
import LexicalEditor from "../components/LexicalEditor";
import { notify } from "../utils/notify";

export default function ServiceCredentials() {
  const { serviceId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchService();
  }, [serviceId, user, isAdmin]);

  async function fetchService() {
    if (!isAdmin && !user) return;
    try {
      const client = isAdmin ? getSupabaseAdmin() || supabase : supabase;
      let query = client
        .from("user_services")
        .select("*, services(*)")
        .eq("id", serviceId);
      if (!isAdmin) query = query.eq("user_id", user.id);
      const { data, error } = await query.single();

      if (error) throw error;
      setService(data);
    } catch (err) {
      console.error("Error:", err);
      notify("Error al cargar el servicio", "error");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(content) {
    setSaving(true);
    try {
      const client = isAdmin ? getSupabaseAdmin() || supabase : supabase;
      const { error } = await client
        .from("user_services")
        .update({ accesos: content })
        .eq("id", serviceId);

      if (error) throw error;
      setService({ ...service, accesos: content });
      notify("Credenciales guardadas", "success");
    } catch (err) {
      console.error("Error:", err);
      notify("Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!service) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/dashboard")}
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
          Volver
        </button>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">
            Credenciales - {service.services?.name}
          </h1>
        </div>
        <div className="p-6">
          <LexicalEditor
            value={service.accesos || ""}
            onChange={handleSave}
            showEditor={true}
            onEdit={() => navigate(-1)}
            stayOpenAfterSave={true}
          />
        </div>
      </div>
    </div>
  );
}
