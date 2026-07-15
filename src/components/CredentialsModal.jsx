import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { notify } from "@/utils/notify"
import { normalizeUrl } from "@/utils/formatUtils"
import Modal from "@/components/Modal"
import LexicalEditor from "@/components/LexicalEditor"
import { Button } from "@/components/ui/button"
import { ExternalLink, Copy, Eye, EyeOff, Loader2, Key } from "lucide-react"

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-xs font-medium transition-all shrink-0"
    >
      <Copy className="w-3 h-3" />
      {copied ? "Copiado" : "Copiar"}
    </button>
  )
}

export default function CredentialsModal({ service, isOpen, onClose, canEdit = false }) {
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localService, setLocalService] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState("")
  const [editPassword, setEditPassword] = useState("")

  async function handleSaveAccesos(content) {
    if (!localService?.id) return
    setSaving(true)
    try {
      await pb.collection('user_services').update(localService.id, { accesos: content })
      setLocalService({ ...localService, accesos: content })
      notify("Credenciales guardadas", "success")
    } catch (err) {
      notify("Error al guardar", "error")
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCredField(field, value) {
    if (!localService?.id) return
    try {
      await pb.collection('user_services').update(localService.id, { [field]: value || null })
      setLocalService({ ...localService, [field]: value || null })
    } catch (err) {
      notify("Error al guardar", "error")
    }
  }

  useEffect(() => {
    if (isOpen && service?.id) {
      setLoading(true)
      pb.collection('user_services').getOne(service.id, { expand: 'service_id', requestKey: null })
        .then((s) => { setLocalService(s); setEditUser(s.acceso_user || ""); setEditPassword(s.acceso_password || "") })
        .catch(() => notify("Error al cargar credenciales", "error"))
        .finally(() => setLoading(false))
    } else {
      setLocalService(null)
      setShowPassword(false)
      setEditUser("")
      setEditPassword("")
    }
  }, [isOpen, service?.id])

  const s = localService || service
  const url = s?.url_dominio ? normalizeUrl(s.url_dominio) : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Credenciales - ${s?.expand?.service_id?.name || "Servicio"}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="space-y-5">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-all text-sm font-medium text-primary">
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span className="truncate">{s.url_dominio}</span>
            </a>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {canEdit ? (
              <>
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Usuario</p>
                  <input type="text" value={editUser} onChange={(e) => setEditUser(e.target.value)} onBlur={() => handleSaveCredField("acceso_user", editUser)} placeholder="usuario" className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Contraseña</p>
                  <div className="flex items-center gap-2">
                    <input type={showPassword ? "text" : "password"} value={editPassword} onChange={(e) => setEditPassword(e.target.value)} onBlur={() => handleSaveCredField("acceso_password", editPassword)} placeholder="contraseña" className="flex h-9 flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <button onClick={() => setShowPassword(!showPassword)} className="p-1.5 rounded-md hover:bg-muted transition-all shrink-0">
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Usuario</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono font-medium text-foreground truncate">{s?.acceso_user || "—"}</p>
                    <CopyButton value={s?.acceso_user} label="user" />
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Contraseña</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-mono font-medium text-foreground truncate">
                      {s?.acceso_password ? (showPassword ? s.acceso_password : "••••••••") : "—"}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      {s?.acceso_password && (
                        <button onClick={() => setShowPassword(!showPassword)} className="p-1 rounded-md hover:bg-muted transition-all">
                          {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                      )}
                      <CopyButton value={s?.acceso_password} label="password" />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="border-t pt-4">
            {canEdit ? (
              <LexicalEditor
                value={s?.accesos || ""}
                onChange={handleSaveAccesos}
                showEditor={true}
                stayOpenAfterSave={true}
              />
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-bold text-foreground">Credenciales y Accesos</h3>
                {s?.accesos ? (
                  <div className="prose prose-invert max-w-none p-4 bg-muted/30 rounded-lg min-h-[100px] border border-border" dangerouslySetInnerHTML={{ __html: s.accesos.replace(/\n/g, "<br/>") }} />
                ) : (
                  <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                    <p className="text-muted-foreground font-medium">No hay accesos registrados</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
