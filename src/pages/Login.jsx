import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Footer from "../components/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  async function handleSubmit(e) {
    e.preventDefault();
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary">
            Nilspineda
          </Link>
          <p className="text-gray-400 mt-2">Ingresa a tu cuenta</p>
        </div>

        <div className="bg-card-bg rounded-2xl p-6 lg:p-8 border border-border-dark">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-[#1b524b] placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-sidebar-bg border border-border-dark rounded-xl text-[#1b524b] placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-xl font-medium hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <p className="text-gray-400 text-sm">
            ¿Necesitas ayuda?{" "}
            <a href="#" className="text-primary hover:text-primary-light">
              Contacta soporte
            </a>
          </p>
        </div>

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
