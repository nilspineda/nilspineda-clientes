import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Footer from "../components/Footer";

const navItems = [
  {
    path: "/admin",
    label: "Dashboard",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    path: "/admin/users",
    label: "Usuarios",
    icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  },
  {
    path: "/admin/services",
    label: "Servicios",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    path: "/admin/payments",
    label: "Pagos",
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
];

function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-60 h-screen fixed left-0 top-0 bg-sidebar-bg border-r border-border-dark flex flex-col z-50">
      <div className="p-6 border-b border-border-dark">
        <Link to="/admin" className="text-xl font-bold text-white">
          Nilspineda
        </Link>
        <p className="text-sm text-gray-400 mt-1">Panel Admin</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            item.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-white"
                  : "text-gray-400 hover:bg-card-hover hover:text-white"
              }`}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={item.icon}
                />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border-dark">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-card-hover hover:text-white transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Ver Cliente
        </Link>
      </div>
    </aside>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        <div
          className="hidden lg:flex items-center justify-end gap-4 px-6 py-3 border-b"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {profile?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="text-sm" style={{ color: "var(--foreground)" }}>
              {profile?.name}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-md"
          >
            Cerrar sesión
          </button>
        </div>

        <div className="p-4 lg:p-8 flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>
    </div>
  );
}
