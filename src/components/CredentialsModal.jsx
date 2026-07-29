import { useState, useEffect } from "react"
import pb from "@/lib/pocketbaseClient"
import { useAuth } from "@/hooks/useAuth"
import { notify } from "@/utils/notify"
import { normalizeUrl } from "@/utils/formatUtils"
import { sanitizeRichText } from "@/utils/sanitize"
import { verifyPin } from "@/utils/pinAuth"
import Modal from "@/components/Modal"
import LexicalEditor from "@/components/LexicalEditor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExternalLink, Copy, Eye, EyeOff, Loader2, Key, ShieldCheck } from "lucide-react"

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
  const { profile } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [localService, setLocalService] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState("")
  const [editPassword, setEditPassword] = useState("")
  const [authRequired, setAuthRequired] = useState(false)
  const [authPin, setAuthPin] = useState("")
  const [authError, setAuthError] = useState("")
  const [authing, setAuthing] = useState(false)
  const [authGranted, setAuthGranted] = useState(false)
  const [hasPin, setHasPin] = useState(false)

  const isAdmin = profile?.role === "admin"

  async function handleAuth(e) {
    e?.preventDefault()
    if (!authPin) return
    setAuthing(true)
    setAuthError("")
    try {
      if (!profile?.pin) {
        setAuthError("No tienes un PIN configurado. Configúralo en tu perfil.")
        return
      }
      const valid = await verifyPin(authPin, profile.pin)
      if (valid) {
        setAuthGranted(true)
        setAuthPin("")
      } else {
        setAuthError("PIN incorrecto")
      }
    } catch {
      setAuthError("Error al verificar PIN")
    } finally {
      setAuthing(false)
    }
  }

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
      setHasPin(!!profile?.pin)
      setAuthRequired(isAdmin && !!profile?.pin)
      setAuthGranted(false)
      setAuthPin("")
      setAuthError("")
      setShowPassword(false)
      pb.collection('user_services').getOne(service.id, { expand: 'service_id', requestKey: null })
        .then((s) => { setLocalService(s); setEditUser(s.acceso_user || ""); setEditPassword(s.acceso_password || "") })
        .catch(() => notify("Error al cargar credenciales", "error"))
        .finally(() => setLoading(false))
    } else {
      setLocalService(null)
      setShowPassword(false)
      setEditUser("")
      setEditPassword("")
      setAuthRequired(false)
      setAuthGranted(false)
      setAuthPin("")
      setAuthError("")
    }
  }, [isOpen, service?.id, isAdmin, profile?.pin])

  const s = localService || service
  const url = s?.url_dominio ? normalizeUrl(s.url_dominio) : null

  function renderContent() {
    return (
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
                <div className="prose prose-invert max-w-none p-4 bg-muted/30 rounded-lg min-h-[100px] border border-border" dangerouslySetInnerHTML={{ __html: sanitizeRichText(s.accesos) }} />
              ) : (
                <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                  <p className="text-muted-foreground font-medium">No hay accesos registrados</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Credenciales - ${s?.expand?.service_id?.name || "Servicio"}`} size="lg">
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : isAdmin && !hasPin ? (
        <>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-sm text-yellow-600 dark:text-yellow-400 text-center space-y-2">
            <ShieldCheck className="w-6 h-6 mx-auto" />
            <p>No tienes un PIN de seguridad configurado.</p>
            <p>
              <a href="/profile" className="underline font-medium">Configúralo en tu perfil</a>{" "}
              para proteger el acceso a las credenciales.
            </p>
          </div>
          {renderContent()}
        </>
      ) : authRequired && !authGranted ? (
        <form onSubmit={handleAuth} className="space-y-4 py-4">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Verificación de seguridad</h3>
            <p className="text-sm text-muted-foreground">Ingresa tu PIN de seguridad para ver las credenciales</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="authPin">Tu PIN</Label>
            <Input
              id="authPin"
              type="password"
              inputMode="numeric"
              value={authPin}
              onChange={(e) => setAuthPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              autoFocus
              maxLength={6}
            />
            {authError && <p className="text-sm text-destructive">{authError}</p>}
          </div>
          <Button type="submit" disabled={authing || !authPin} className="w-full gap-2">
            {authing ? <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</> : <><ShieldCheck className="w-4 h-4" /> Verificar</>}
          </Button>
        </form>
      ) : (
        renderContent()
      )}
    </Modal>
  )
}
