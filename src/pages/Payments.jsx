import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { supabase } from "../lib/supabaseClient";
import { formatDate } from "../utils/dateUtils";

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, [user]);

  async function fetchPayments() {
    if (!user) return;
    const { data, error } = await supabase
      .from("payments")
      .select("*, services(*)")
      .eq("user_id", user.id)
      .order("payment_date", { ascending: false });

    if (!error) setPayments(data || []);
    setLoading(false);
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
        <h1 className="text-2xl font-bold text-foreground">Mis Pagos</h1>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-6">
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 font-medium">
                No hay pagos registrados
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
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
                      ${payment.amount || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
