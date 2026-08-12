import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/hooks/useAuth"
import pb from "@/lib/pocketbaseClient"

import { formatCurrency } from "@/utils/formatUtils"
import { formatDate } from "@/utils/dateUtils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Wallet, CheckCircle, Clock, FileText, Loader2, Image } from "lucide-react"

export default function Payments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [oneTimePending, setOneTimePending] = useState([])
  const [loading, setLoading] = useState(true)
  const [comprobantes, setComprobantes] = useState([])

  const comprobantesMap = useMemo(() => {
    const m = {}
    comprobantes.forEach(c => {
      if (!m[c.payment_id]) m[c.payment_id] = []
      m[c.payment_id].push(c)
    })
    return m
  }, [comprobantes])

  useEffect(() => {
    fetchPayments()
  }, [user])

  async function fetchPayments() {
    if (!user) return
    try {
      const [paymentsData, servicesData, compData] = await Promise.all([
        pb.collection('payments').getFullList({
          filter: `user_id = "${user.id}"`,
          sort: '-payment_date',
          expand: 'user_service_id,payment_account,user_service_id.service_id',
          requestKey: null,
        }),
        pb.collection('user_services').getFullList({
          filter: `user_id = "${user.id}"`,
          expand: 'service_id',
          requestKey: null,
        }),
        pb.collection('comprobantes').getFullList({
          filter: `user_id = "${user.id}"`,
          sort: 'created',
          requestKey: null,
        }),
      ])
      setPayments(paymentsData || [])
      setComprobantes(compData || [])

      const userServices = servicesData || []

      const pending = userServices
        .filter((s) => s.billing_type === "one_time")
        .map((s) => {
          const price = parseFloat(s.price) || 0
          const svcPayments = (paymentsData || []).filter((p) => p.user_service_id === s.id && p.status === "paid")
          const totalPaid = svcPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0)
          return { service: s, price, totalPaid }
        })
        .filter(({ price, totalPaid }) => totalPaid < price)
        .map(({ service: s, price, totalPaid }) => ({
          id: `one_time_pending_${s.id}`,
          user_service_id: s.id,
          service_group_id: s.expand?.service_id?.id,
          service_group_name: s.expand?.service_id?.name || s.name,
          amount: price - totalPaid,
          service_name: s.expand?.service_id?.name || s.name || "Servicio",
          payment_date: s.expires_at || s.start_date || new Date().toISOString(),
          status: "pending",
        }))

      setOneTimePending(pending)
    } catch (err) {
      console.error("Error fetching payments:", err)
    }
    setLoading(false)
  }

  const allItems = [...payments, ...oneTimePending]

  const totalPaid = payments
    .filter(p => p.status === "paid")
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

  const totalPending = allItems
    .filter(p => p.status === "pending" || p.id?.startsWith?.("one_time_pending_"))
    .reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)

  const groupedByService = useMemo(() => {
    const map = new Map()
    allItems.forEach((payment) => {
      const isPending = payment.id?.startsWith?.("one_time_pending_")
      const us = payment.expand?.user_service_id
      const base = us?.expand?.service_id
      const key = payment.service_group_id || base?.id || payment.user_service_id || payment.id
      const groupName = payment.service_group_name || base?.name || us?.name || "Servicio"
      if (!map.has(key)) {
        map.set(key, { key, name: groupName, items: [] })
      }
      map.get(key).items.push({
        ...payment,
        isPending,
        displayName: payment.service_name || us?.name || base?.name || "Servicio",
        domain: isPending ? "" : us?.url_dominio || "",
      })
    })
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allItems])

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
        <p className="text-sm text-muted-foreground mt-1">Historial de pagos y saldos pendientes</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total Pagado</p>
          <p className="text-3xl font-bold text-green-500">{formatCurrency(totalPaid)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-muted-foreground">Total Pendiente</p>
          <p className="text-3xl font-bold text-orange-500">{formatCurrency(totalPending)}</p>
        </Card>
      </div>

<Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {groupedByService.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  <FileText className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">No hay pagos registrados</p>
              </div>
            ) : (
              <div className="p-4 space-y-5">
                {groupedByService.map((group) => (
                  <div key={group.key}>
                    <div className="flex items-baseline gap-2 px-1 mb-2">
                      <h3 className="text-lg font-extrabold text-foreground truncate">{group.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.items.map((payment) => {
                        const isPendingItem = payment.isPending
                        const svcName = isPendingItem
                          ? payment.service_name
                          : payment.expand?.user_service_id?.name || payment.expand?.user_service_id?.expand?.service_id?.name || "-"
                        const serviceExpiry = isPendingItem
                          ? payment.payment_date
                          : payment.expand?.user_service_id?.expires_at
                        const desc = (isPendingItem || payment.status === "pending")
                          ? formatDate(serviceExpiry || payment.payment_date)
                          : formatDate(payment.payment_date)
                        const accName = isPendingItem
                          ? ""
                          : typeof payment.payment_account === 'object'
                            ? payment.payment_account?.name
                            : payment.expand?.payment_account?.name || ""
                        return (
                          <div key={payment.id} className={`rounded-lg border bg-card p-3 space-y-2 h-full ${isPendingItem || payment.status === "pending" ? "border-orange-500/20" : "border-green-500/20"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                {payment.domain ? (
                                  <p className="font-semibold text-foreground text-sm truncate text-blue-500">{payment.domain}</p>
                                ) : (
                                  <p className="font-semibold text-foreground text-sm truncate">{svcName}</p>
                                )}
                              </div>
                              <span className="font-bold text-foreground shrink-0">{formatCurrency(payment.amount)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs text-muted-foreground min-w-0 truncate">{desc}</span>
                              <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md font-medium shrink-0 ${
                                isPendingItem || payment.status === "pending"
                                  ? "bg-orange-500/10 border border-orange-500/30 text-orange-500"
                                  : payment.status === "paid"
                                    ? "bg-green-500/10 border border-green-500/30 text-green-500"
                                    : "bg-destructive/10 border border-destructive/30 text-destructive"
                              }`}>
                                {isPendingItem || payment.status === "pending" ? (
                                  <><Clock className="w-3 h-3" /> Pendiente</>
                                ) : (
                                  <><CheckCircle className="w-3 h-3" /> Pagado</>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3 pt-2 border-t">
                              {accName ? <span className="text-xs text-muted-foreground">Cuenta: {accName}</span> : <span />}
                              {!isPendingItem && comprobantesMap[payment.id]?.length ? (
                                <div className="flex gap-1">
                                  {comprobantesMap[payment.id].map((c) => (
                                    <a key={c.id} href={pb.files.getURL(c, 'file')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                      <Image className="w-4 h-4" />
                                      Ver
                                    </a>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
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
