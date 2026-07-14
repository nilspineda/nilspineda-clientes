import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { notify } from "@/utils/notify"
import Modal from "@/components/Modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Package, Plus, Search, Edit3, Trash2, Zap, Loader2 } from "lucide-react"

const SERVICE_TYPES = [
  { value: "dominio", label: "Dominio", color: "default" },
  { value: "hosting", label: "Hosting", color: "secondary" },
  { value: "correo", label: "Correo", color: "outline" },
  { value: "membresia", label: "Membresía", color: "default" },
  { value: "personalizado", label: "Personalizado", color: "secondary" },
]

function getTypeInfo(type) {
  return SERVICE_TYPES.find((t) => t.value === type) || SERVICE_TYPES[4]
}

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceUsage, setServiceUsage] = useState({})
  const [formData, setFormData] = useState({ name: "", type: "dominio" })

  useEffect(() => { fetchServices() }, [])

  async function fetchServices() {
    try {
      const servicesData = await pb.collection('services').getFullList({ sort: '-created' })
      const userServices = await pb.collection('user_services').getFullList()
      const counts = {}
      userServices.forEach((s) => {
        if (s.service_id) counts[s.service_id] = (counts[s.service_id] || 0) + 1
      })
      setServiceUsage(counts)
      setServices(servicesData || [])
    } catch (err) {
      console.error("Error fetching services:", err)
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!formData.name || formData.name.trim() === "") {
      notify("El nombre del servicio es requerido", "error")
      return
    }
    try {
      const payload = { name: formData.name.trim(), type: formData.type, price: 0 }
      if (editingService) {
        await pb.collection('services').update(editingService.id, payload)
        notify("Servicio actualizado correctamente", "success")
      } else {
        await pb.collection('services').create(payload)
        notify("Servicio creado correctamente", "success")
      }
      fetchServices()
      resetForm()
    } catch (error) {
      console.error("Error guardando servicio:", error)
      notify("Error al guardar servicio: " + error.message, "error")
    }
  }

  function resetForm() {
    setShowModal(false)
    setEditingService(null)
    setFormData({ name: "", type: "dominio" })
  }

  function handleEdit(service) {
    setEditingService(service)
    setFormData({ name: service.name, type: service.type || "dominio" })
    setShowModal(true)
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return
    try {
      await pb.collection('services').delete(id)
      fetchServices()
      notify("Servicio eliminado correctamente", "success")
    } catch (error) {
      console.error("Error eliminando servicio:", error)
      notify("Error al eliminar servicio", "error")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const filteredServices = services.filter(
    (s) => !searchTerm || s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.type?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Servicios Base</h1>
            <p className="text-sm text-muted-foreground">{filteredServices.length} servicios</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </Button>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar servicios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 sm:w-64"
          />
        </div>
      </Card>

      <Modal isOpen={showModal} onClose={resetForm} title={editingService ? "Editar Servicio" : "Nuevo Servicio"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre del servicio</label>
            <input type="text" placeholder="Ej: Hosting Basic, Dominio .com" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo de servicio</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {SERVICE_TYPES.map((type) => (<option key={type.value} value={type.value}>{type.label}</option>))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Nombre</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Clientes</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-primary uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No hay servicios creados.</td></tr>
              ) : (
                services.map((service) => {
                  const typeInfo = getTypeInfo(service.type)
                  return (
                    <tr key={service.id} className="hover:bg-muted/50 transition-all">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-primary" />
                          </div>
                          <span className="text-foreground font-semibold">{service.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4"><Badge variant={typeInfo.color}>{typeInfo.label}</Badge></td>
                      <td className="px-6 py-4"><span className="px-3 py-1.5 rounded-md bg-muted text-muted-foreground font-medium text-sm">{serviceUsage[service.id] || 0} clientes</span></td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}><Edit3 className="w-4 h-4 mr-1" />Editar</Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(service.id)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4 mr-1" />Eliminar</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
