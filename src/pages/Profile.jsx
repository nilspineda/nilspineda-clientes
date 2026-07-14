import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import pb from "@/lib/pocketbaseClient"
import { normalizeWhatsapp, formatWhatsapp } from "@/utils/formatUtils"
import { notify } from "@/utils/notify"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, User, Mail, Phone, Lock, Save } from "lucide-react"

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", currentPassword: "", newPassword: "" })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || "",
        email: profile.email || "",
        whatsapp: profile.whatsapp || "",
        currentPassword: "",
        newPassword: "",
      })
      setLoading(false)
    }
  }, [profile])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const updateData = {
        name: form.name,
        email: form.email.trim(),
        whatsapp: normalizeWhatsapp(form.whatsapp),
      }
      if (form.newPassword) {
        if (!form.currentPassword) {
          notify("Debes ingresar tu contraseña actual para cambiarla", "error")
          setSaving(false)
          return
        }
        updateData.oldPassword = form.currentPassword
        updateData.password = form.newPassword
        updateData.passwordConfirm = form.newPassword
      }
      await pb.collection('users').update(user.id, updateData)
      if (form.newPassword) {
        try { await pb.collection('users').update(user.id, { plain_password: form.newPassword }) } catch (e) { console.warn("plain_password fallo", e) }
      }
      notify("Perfil actualizado correctamente", "success")
      setForm((f) => ({ ...f, currentPassword: "", newPassword: "" }))
      await refreshProfile?.()
    } catch (err) {
      console.error("Error actualizando perfil:", err)
      if (err.message?.includes("oldPassword")) {
        notify("La contraseña actual no es correcta", "error")
      } else {
        notify("Error al actualizar perfil: " + (err.message || err), "error")
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mi Perfil</h1>
          <p className="text-sm text-muted-foreground">Administra tus datos personales</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            Información personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  className="pl-9"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  type="text"
                  className="pl-9"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                  placeholder="+57 3001112233"
                />
              </div>
              {form.whatsapp && (
                <p className="text-xs text-muted-foreground">
                  Formato: {formatWhatsapp(form.whatsapp) || form.whatsapp}
                </p>
              )}
            </div>

            <div className="border-t pt-5">
              <div className="flex items-center gap-2 mb-4">
                <Lock className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Cambiar contraseña</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Deja estos campos vacíos si no deseas cambiar tu contraseña.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Contraseña actual</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={form.currentPassword}
                    onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                    placeholder="Ingresa tu contraseña actual"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={form.newPassword}
                    onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full gap-2">
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : (
                <><Save className="w-4 h-4" /> Guardar cambios</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
