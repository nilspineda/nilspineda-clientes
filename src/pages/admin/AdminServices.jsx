import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { notify } from "@/utils/notify"
import Modal from "@/components/Modal"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Package, Plus, Search, Edit3, Trash2, Zap, Loader2, Tags, Check } from "lucide-react"

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

const DEFAULT_TYPES = [
  { value: "dominio", name: "Dominio", color: "default" },
  { value: "hosting", name: "Hosting", color: "secondary" },
  { value: "correo", name: "Correo", color: "outline" },
  { value: "membresia", name: "Membresía", color: "default" },
  { value: "personalizado", name: "Personalizado", color: "secondary" },
]

const COLOR_OPTIONS = [
  { value: "default", label: "Default", class: "bg-primary/10 text-primary border-primary/20" },
  { value: "secondary", label: "Secondary", class: "bg-secondary text-secondary-foreground" },
  { value: "outline", label: "Outline", class: "border-border text-muted-foreground" },
  { value: "destructive", label: "Destructive", class: "bg-destructive/10 text-destructive border-destructive/20" },
]

function getTypeInfo(type, types) {
  return types.find((t) => t.value === type)
}

export default function AdminServices() {
  const [services, setServices] = useState([])
  const [serviceTypes, setServiceTypes] = useState(DEFAULT_TYPES)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTypesModal, setShowTypesModal] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [serviceUsage, setServiceUsage] = useState({})
  const [formData, setFormData] = useState({ name: "", type: "dominio" })
  const [typeForm, setTypeForm] = useState({ name: "", color: "default" })

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [servicesData, userServices, typesData] = await Promise.all([
        pb.collection('services').getFullList({ sort: '-created', requestKey: null }),
        pb.collection('user_services').getFullList({ requestKey: null }),
        pb.collection('service_types').getFullList({ sort: 'name', requestKey: null }).catch(() => []),
      ])
      const counts = {}
      userServices.forEach((s) => {
        if (s.service_id) counts[s.service_id] = (counts[s.service_id] || 0) + 1
      })
      setServiceUsage(counts)
      setServices(servicesData || [])
      if (typesData && typesData.length > 0) {
        setServiceTypes(typesData)
      }
    } catch (err) {
      console.error("Error fetching data:", err)
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
      fetchAll()
      resetForm()
    } catch (error) {
      console.error("Error guardando servicio:", error)
      notify("Error al guardar servicio: " + error.message, "error")
    }
  }

  function resetForm() {
    setShowModal(false)
    setEditingService(null)
    setFormData({ name: "", type: serviceTypes[0]?.value || "dominio" })
  }

  function handleEdit(service) {
    setEditingService(service)
    setFormData({ name: service.name, type: service.type || serviceTypes[0]?.value || "dominio" })
    setShowModal(true)
  }

  async function handleDelete(id) {
    if (!confirm("¿Estás seguro de eliminar este servicio?")) return
    try {
      await pb.collection('services').delete(id)
      fetchAll()
      notify("Servicio eliminado correctamente", "success")
    } catch (error) {
      console.error("Error eliminando servicio:", error)
      notify("Error al eliminar servicio", "error")
    }
  }

  function resetTypeForm() {
    setEditingType(null)
    setTypeForm({ name: "", color: "default" })
  }

  function handleEditType(type) {
    setEditingType(type)
    setTypeForm({ name: type.name, color: type.color || "default" })
  }

  async function handleTypeSubmit(e) {
    e.preventDefault()
    if (!typeForm.name.trim()) {
      notify("El nombre es requerido", "error")
      return
    }
    try {
      const value = slugify(typeForm.name.trim())
      const payload = { name: typeForm.name.trim(), value, color: typeForm.color }
      if (editingType) {
        await pb.collection('service_types').update(editingType.id, payload)
        notify("Tipo actualizado correctamente", "success")
      } else {
        await pb.collection('service_types').create(payload)
        notify("Tipo creado correctamente", "success")
      }
      resetTypeForm()
      fetchAll()
    } catch (error) {
      console.error("Error guardando tipo:", error)
      notify("Error al guardar tipo: " + error.message, "error")
    }
  }

  async function handleDeleteType(id) {
    if (!confirm("¿Estás seguro de eliminar este tipo?")) return
    try {
      await pb.collection('service_types').delete(id)
      fetchAll()
      notify("Tipo eliminado correctamente", "success")
    } catch (error) {
      console.error("Error eliminando tipo:", error)
      notify("Error al eliminar tipo", "error")
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
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { resetTypeForm(); setShowTypesModal(true) }}>
            <Tags className="w-4 h-4 mr-2" />
            Tipos
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Servicio
          </Button>
        </div>
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

      {/* Service Modal */}
      <Modal isOpen={showModal} onClose={resetForm} title={editingService ? "Editar Servicio" : "Nuevo Servicio"} size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Nombre del servicio</label>
            <input type="text" placeholder="Ej: Hosting Basic, Dominio .com" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Tipo de servicio</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {serviceTypes.map((type) => (<option key={type.value || type.id} value={type.value}>{type.name}</option>))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" className="flex-1">{editingService ? "Guardar Cambios" : "Crear Servicio"}</Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
          </div>
        </form>
      </Modal>

      {/* Types Management Modal */}
      <Modal isOpen={showTypesModal} onClose={() => setShowTypesModal(false)} title="Gestionar Tipos de Servicio" size="md">
        <div className="space-y-4">
          <form onSubmit={handleTypeSubmit} className="flex items-end gap-2 border-b border-border pb-4">
            <div className="flex-[2]">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Nombre</label>
              <input type="text" placeholder="Ej: Dominio" value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} required className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Color</label>
              <select value={typeForm.color} onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {COLOR_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
              </select>
            </div>
            <Button type="submit" size="sm" className="h-9">
              {editingType ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {serviceTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay tipos creados.</p>
            ) : (
              serviceTypes.map((type) => (
                <div key={type.id || type.value} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Badge variant={type.color}>{type.name}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditType(type)}>
                      <Edit3 className="w-3.5 h-3.5" />
                    </Button>
                    {type.id && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteType(type.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Clientes</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">No hay servicios creados.</td></tr>
              ) : (
                services.map((service) => {
                  const typeInfo = getTypeInfo(service.type, serviceTypes)
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
                      <td className="px-6 py-4">
                        {typeInfo ? <Badge variant={typeInfo.color}>{typeInfo.name}</Badge> : <Badge variant="outline">{service.type}</Badge>}
                      </td>
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
