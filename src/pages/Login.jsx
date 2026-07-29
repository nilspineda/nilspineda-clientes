import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import pb from "@/lib/pocketbaseClient";
import { normalizeWhatsapp, formatWhatsapp } from "@/utils/formatUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff, Loader2, LogIn, MessageCircle, Mail, ExternalLink } from "lucide-react"
import logoSrc from "@/assets/logo.svg";

const RATE_LIMIT_WINDOW = 15000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [supportWhatsapp, setSupportWhatsapp] = useState("3167195500");
  const [supportEmail, setSupportEmail] = useState("nilspineda@outlook.com");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const attemptTimestamps = useRef([]);

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    setMounted(true);
    async function fetchSupport() {
      try {
        const data = await pb.collection('settings').getFullList({ requestKey: null });
        const wa = data.find(s => s.key === "whatsapp_support");
        const em = data.find(s => s.key === "admin_email");
        if (wa?.value) setSupportWhatsapp(wa.value);
        if (em?.value) setSupportEmail(em.value);
      } catch (err) {
        console.error("Error al cargar datos de soporte:", err);
      }
    }
    fetchSupport();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const now = Date.now();
    attemptTimestamps.current = attemptTimestamps.current.filter(t => now - t < RATE_LIMIT_WINDOW);
    if (attemptTimestamps.current.length >= RATE_LIMIT_MAX_ATTEMPTS) {
      const waitSeconds = Math.ceil((RATE_LIMIT_WINDOW - (now - attemptTimestamps.current[0])) / 1000);
      setError(`Demasiados intentos. Intenta de nuevo en ${waitSeconds} segundos.`);
      return
    }
    attemptTimestamps.current.push(now);
    setError("");
    setLoading(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    if (!resetEmail) return
    setResetSending(true)
    try {
      await pb.collection('users').requestPasswordReset(resetEmail)
      setResetSent(true)
    } catch {
      setError("Error al enviar el correo de recuperación")
    } finally {
      setResetSending(false)
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true)
    setError("")
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' })
      navigate(from, { replace: true })
    } catch (err) {
      if (err?.message?.includes("popup") || err?.message?.includes("closed")) {
        setError("Ventana de Google cerrada o bloqueada. Permite ventanas emergentes.")
      } else {
        setError(err?.message || "Error al iniciar sesión con Google")
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel - brand */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-card border-r border-border/50">
        <div
          className={`flex flex-col items-center text-center p-12 transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <img src={logoSrc} alt="Nilspineda" className="h-12 mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Nilspineda
          </h1>
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            Gestión de servicios para clientes
          </p>

          <div className="mt-16 flex items-center gap-10">
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">100%</p>
              <p className="text-sm text-muted-foreground mt-1">Seguro</p>
            </div>
            <div className="w-px h-14 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">24/7</p>
              <p className="text-sm text-muted-foreground mt-1">Soporte</p>
            </div>
            <div className="w-px h-14 bg-border" />
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">Pro</p>
              <p className="text-sm text-muted-foreground mt-1">Calidad</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center px-4 py-12">
        <div
          className={`w-full max-w-md transition-all duration-1000 delay-200 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src={logoSrc} alt="Nilspineda" className="h-8 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground">Nilspineda</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Gestión de clientes
            </p>
          </div>

          <div className="text-center mb-8 hidden lg:block">
            <h2 className="text-3xl font-bold text-foreground">Bienvenido</h2>
            <p className="text-muted-foreground mt-2">
              Ingresa a tu cuenta para continuar
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Iniciar sesión</CardTitle>
              <CardDescription>
                Usa tu email y contraseña para acceder
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-destructive/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold">!</span>
                    </div>
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Contraseña</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Iniciando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Iniciar sesión
                    </>
                  )}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">o</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  disabled={googleLoading}
                  onClick={handleGoogleLogin}
                  className="w-full gap-2"
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  {googleLoading ? "Conectando con Google..." : "Iniciar sesión con Google"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="mt-8 p-4 rounded-xl border border-border/50 bg-card">
            <p className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              ¿Necesitas ayuda? Contáctanos
            </p>
            <div className="space-y-2">
              <a
                href={`https://wa.me/${normalizeWhatsapp(supportWhatsapp)}?text=${encodeURIComponent("Hola, necesito ayuda con el inicio de sesión.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-green-500/5 border border-green-500/20 hover:bg-green-500/10 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                  <MessageCircle className="w-5 h-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">WhatsApp</p>
                  <p className="text-xs text-muted-foreground">{formatWhatsapp(supportWhatsapp) || supportWhatsapp}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Email</p>
                  <p className="text-xs text-muted-foreground truncate">{supportEmail}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail("") }}>
          <div className="w-full max-w-md bg-card border rounded-xl p-6 shadow-xl space-y-4" onClick={e => e.stopPropagation()}>
            {resetSent ? (
              <>
                <div className="text-center space-y-3 py-4">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <Mail className="w-7 h-7 text-green-500" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Correo enviado</h3>
                  <p className="text-sm text-muted-foreground">
                    Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.
                  </p>
                </div>
                <Button onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetEmail("") }} className="w-full">
                  Cerrar
                </Button>
              </>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-bold text-foreground">Recuperar contraseña</h3>
                  <p className="text-sm text-muted-foreground">Ingresa tu email y te enviaremos un enlace para restablecerla.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input id="resetEmail" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="tu@email.com" required />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={resetSending || !resetEmail} className="flex-1">
                    {resetSending ? "Enviando..." : "Enviar enlace"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForgotPassword(false); setResetEmail("") }} className="flex-1">
                    Cancelar
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
