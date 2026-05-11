import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function Navbar() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link
          to={isAdmin ? "/admin" : "/dashboard"}
          className="text-xl font-bold text-gray-900"
        >
          Nilspineda
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setOpen((s) => !s)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
            aria-label="Abrir menú"
            aria-expanded={open}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          <div
            className={`${open ? "block" : "hidden"} md:flex md:items-center md:gap-4`}
          >
            <span className="text-sm text-gray-600 block md:inline">
              {profile?.name}
            </span>
            {isAdmin ? (
              <Link
                to="/admin"
                className="text-sm text-blue-600 hover:text-blue-800 block md:inline"
              >
                Admin
              </Link>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm text-blue-600 hover:text-blue-800 block md:inline"
                >
                  Mi Dashboard
                </Link>
                <Link
                  to="/payments"
                  className="text-sm text-blue-600 hover:text-blue-800 block md:inline"
                >
                  Mis Pagos
                </Link>
              </>
            )}
            <button
              onClick={handleSignOut}
              className="text-sm text-red-600 hover:text-red-800 block md:inline mt-2 md:mt-0"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
