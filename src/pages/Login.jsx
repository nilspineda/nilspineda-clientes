import { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || "/dashboard"

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await signIn(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || "Error al iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left panel - brand */}
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />

        <div
          className={`relative z-10 flex flex-col items-center justify-center w-full p-12 text-center transition-all duration-1000 ${
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
            <span className="text-3xl font-bold text-primary-foreground">NP</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Nilspineda</h1>
          <p className="text-white/60 text-lg max-w-md leading-relaxed">
            Gestión de servicios para clientes
          </p>

          <div className="mt-16 flex items-center gap-10 text-white/50">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">100%</p>
              <p className="text-sm mt-1">Seguro</p>
            </div>
            <div className="w-px h-14 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">24/7</p>
              <p className="text-sm mt-1">Soporte</p>
            </div>
            <div className="w-px h-14 bg-white/10" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">Pro</p>
              <p className="text-sm mt-1">Calidad</p>
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
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
              <span className="text-2xl font-bold text-primary-foreground">NP</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Nilspineda</h2>
            <p className="text-muted-foreground text-sm mt-1">Gestión de clientes</p>
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
                    <a
                      href="#"
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      ¿Olvidaste tu contraseña?
                    </a>
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
              </form>
            </CardContent>
          </Card>

          <p className="text-center mt-6 text-sm text-muted-foreground">
            ¿Necesitas ayuda?{" "}
            <a
              href="#"
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Contacta soporte
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
