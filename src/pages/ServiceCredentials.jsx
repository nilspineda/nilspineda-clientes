import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import pb from "@/lib/pocketbaseClient"
import LexicalEditor from "@/components/LexicalEditor"
import { notify } from "@/utils/notify"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft, Loader2 } from "lucide-react"

export default function ServiceCredentials() {
  const { serviceId } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [service, setService] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchService()
  }, [serviceId, user, isAdmin])

  async function fetchService() {
    if (!isAdmin && !user) return
    try {
      const record = await pb.collection('user_services').getOne(serviceId, { expand: 'service_id' })
      if (!isAdmin && record.user_id !== user.id) {
        throw new Error("No autorizado")
      }
      setService(record)
    } catch (err) {
      console.error("Error:", err)
      notify("Error al cargar el servicio", "error")
      navigate("/dashboard")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(content) {
    setSaving(true)
    try {
      await pb.collection('user_services').update(serviceId, { accesos: content })
      setService({ ...service, accesos: content })
      notify("Credenciales guardadas", "success")
    } catch (err) {
      console.error("Error:", err)
      notify("Error al guardar", "error")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!service) return null

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/dashboard")} className="gap-2">
        <ChevronLeft className="w-4 h-4" />
        Volver
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>
            Credenciales - {service.expand?.service_id?.name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LexicalEditor
            value={service.accesos || ""}
            onChange={handleSave}
            showEditor={true}
            onEdit={() => navigate(-1)}
            stayOpenAfterSave={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
