import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import Footer from "../components/Footer";

function SidebarContent() {
  const { profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const clienteLinks = [
    {
      path: "/dashboard",
      label: "Panel",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
  ];

  const adminLinks = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      path: "/admin/users",
      label: "Clientes",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      path: "/admin/services",
      label: "Servicios",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      path: "/admin/assignments",
      label: "Asignaciones",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
      path: "/admin/payments",
      label: "Pagos",
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
  ];

  const links = isAdmin ? adminLinks : clienteLinks;

  return (
    <>
      <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
        <Link
          to={isAdmin ? "/admin" : "/dashboard"}
          className="text-xl font-bold"
          style={{ color: "var(--foreground)" }}
        >
          Nilspineda
        </Link>
        <p
          className="text-sm mt-1"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          {isAdmin ? "Panel Admin" : "Mi Cuenta"}
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`sidebar-link ${
              location.pathname === link.path
                ? "sidebar-link-active"
                : "sidebar-link-inactive"
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
                d={link.icon}
              />
            </svg>
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-[var(--sidebar-accent)]"
          style={{ color: "var(--sidebar-foreground)" }}
        >
          {theme === "dark" ? (
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
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ) : (
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
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          )}
          <span className="text-sm">
            {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}
          </span>
        </button>
      </div>

      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            {profile?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium truncate"
              style={{ color: "var(--foreground)" }}
            >
              {profile?.name}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: "var(--sidebar-foreground)" }}
            >
              {profile?.dominio || "Sin dominio"}
            </p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition-colors hover:bg-red-500/10 text-red-400"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </>
  );
}

function MobileNav() {
  const { isAdmin, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const clienteLinks = [
    {
      path: "/dashboard",
      label: "Panel",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
  ];

  const adminLinks = [
    {
      path: "/admin",
      label: "Admin",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      path: "/admin/users",
      label: "Clientes",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      path: "/admin/assignments",
      label: "Asignar",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
      path: "/admin/payments",
      label: "Pagos",
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
  ];

  const links = isAdmin ? adminLinks : clienteLinks;

  async function handleMobileSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center p-2 border-t z-40 safe-area-pb"
      style={{ background: "var(--card)", borderColor: "var(--border)" }}
    >
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors"
          style={{
            color:
              location.pathname === link.path
                ? "#10b981"
                : "var(--muted-foreground)",
          }}
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
              d={link.icon}
            />
          </svg>
          <span className="text-[10px] font-medium">{link.label}</span>
        </Link>
      ))}

      <button
        onClick={handleMobileSignOut}
        className="flex flex-col items-center gap-1 px-2 py-1 rounded-xl text-red-500"
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
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
        <span className="text-[10px] font-medium">Salir</span>
      </button>
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl hover:bg-[var(--muted)]"
    >
      {theme === "dark" ? (
        <svg
          className="w-5 h-5"
          style={{ color: "var(--foreground)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        <svg
          className="w-5 h-5"
          style={{ color: "var(--foreground)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

function SidebarLinks({ onClose }) {
  const { isAdmin } = useAuth();
  const location = useLocation();

  const clienteLinks = [
    {
      path: "/dashboard",
      label: "Panel",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
  ];

  const adminLinks = [
    {
      path: "/admin",
      label: "Dashboard",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      path: "/admin/users",
      label: "Clientes",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    },
    {
      path: "/admin/services",
      label: "Servicios",
      icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    },
    {
      path: "/admin/assignments",
      label: "Asignaciones",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    },
    {
      path: "/admin/payments",
      label: "Pagos",
      icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    },
  ];

  const links = isAdmin ? adminLinks : clienteLinks;

  return (
    <>
      {links.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          onClick={onClose}
          className={`sidebar-link ${
            location.pathname === link.path
              ? "sidebar-link-active"
              : "sidebar-link-inactive"
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
              d={link.icon}
            />
          </svg>
          {link.label}
        </Link>
      ))}
    </>
  );
}

export default function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { toggleTheme } = useTheme();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div
      className="flex min-h-screen"
      style={{ background: "var(--background)" }}
    >
      <aside
        className="hidden lg:flex w-64 flex-col fixed left-0 top-0 h-screen z-50"
        style={{
          background: "var(--sidebar)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <SidebarContent />
      </aside>

      <main className="flex-1 lg:ml-64 min-h-screen pb-24 lg:pb-0 flex flex-col">
        {/* Desktop top bar */}
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
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="text-sm text-red-500 hover:text-red-700 px-3 py-2 rounded-md"
          >
            Cerrar sesión
          </button>
        </div>
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b"
          style={{
            background: "var(--background)",
            borderColor: "var(--border)",
          }}
        >
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-[var(--muted)]"
          >
            <svg
              className="w-6 h-6"
              style={{ color: "var(--foreground)" }}
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
          <span
            className="font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Nilspineda
          </span>
          <ThemeToggle />
        </header>

        <div className="p-4 lg:p-6 flex-1">
          <Outlet />
        </div>
        <Footer />
      </main>

      <MobileNav />

      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div
        className={`lg:hidden fixed inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar)" }}
      >
        <div
          className="p-5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}
        >
          <span
            className="text-xl font-bold"
            style={{ color: "var(--foreground)" }}
          >
            Nilspineda
          </span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-xl hover:bg-[var(--sidebar-accent)]"
          >
            <svg
              className="w-5 h-5"
              style={{ color: "var(--sidebar-foreground)" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <nav className="p-3 space-y-1">
          <SidebarLinks onClose={() => setMobileMenuOpen(false)} />
        </nav>
        <div
          className="p-3 border-t mt-auto"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3 mb-3 px-3">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
              {profile?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium truncate"
                style={{ color: "var(--foreground)" }}
              >
                {profile?.name}
              </p>
              <p
                className="text-xs truncate"
                style={{ color: "var(--sidebar-foreground)" }}
              >
                {profile?.dominio || "Sin dominio"}
              </p>
            </div>
          </div>

          <div className="flex gap-3 px-3">
            <button
              onClick={() => {
                toggleTheme();
                setMobileMenuOpen(false);
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-[var(--muted)] text-sm"
            >
              Cambiar tema
            </button>
            <button
              onClick={async () => {
                await signOut();
                setMobileMenuOpen(false);
                navigate("/login");
              }}
              className="flex-1 px-3 py-2 rounded-xl bg-red-50 text-red-600"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
