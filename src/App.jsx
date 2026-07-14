import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./context/ThemeContext";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const ServiceCredentials = lazy(() => import("./pages/ServiceCredentials"));
const AdminIndex = lazy(() => import("./pages/admin/AdminIndex"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const Payments = lazy(() => import("./pages/Payments"));

function Spinner() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) return <Spinner />;

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate
                to={profile?.role === "admin" ? "/admin" : "/dashboard"}
                replace
              />
            ) : (
              <Login />
            )
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/payments" element={<Payments />} />
            <Route
              path="/service/:serviceId/credentials"
              element={<ServiceCredentials />}
            />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminIndex />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={
            <Navigate
              to={
                user
                  ? profile?.role === "admin"
                    ? "/admin"
                    : "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
