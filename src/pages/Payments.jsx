import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import pb from "@/lib/pocketbaseClient"
import { formatDate } from "@/utils/dateUtils"
import { formatCurrency } from "@/utils/formatUtils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, CheckCircle, Clock, FileText, Loader2 } from "lucide-react"

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPayments()
  }, [user])

  async function fetchPayments() {
    if (!user) return
    try {
      const data = await pb.collection('payments').getFullList({
        filter: `user_id = "${user.id}"`,
        sort: '-payment_date',
        expand: 'user_service_id',
      })
      setPayments(data || [])
    } catch (err) {
      console.error("Error fetching payments:", err)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mis Pagos</h1>
        <p className="text-sm text-muted-foreground mt-1">Historial de pagos registrados</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No hay pagos registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-lg flex items-center justify-center ${
                        payment.status === "paid"
                          ? "bg-green-500/10"
                          : "bg-orange-500/10"
                      }`}
                    >
                      {payment.status === "paid" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-orange-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">
                        {payment.expand?.user_service_id?.name || "Pago"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">
                      {payment.payment_method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
