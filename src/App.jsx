import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { usePushNotifications } from "./hooks/usePushNotifications";

import { Toaster } from "./components/ui/sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminServices = lazy(() => import("./pages/admin/AdminServices"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const PersonalNotes = lazy(() => import("./pages/personal/Notes"));
const PersonalTasks = lazy(() => import("./pages/personal/Tasks"));
const Payments = lazy(() => import("./pages/Payments"));
const Profile = lazy(() => import("./pages/Profile"));

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
  usePushNotifications();

  if (loading) return <Spinner />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
      <Toaster />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route
          path="/login"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Login />
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/payments" element={<Payments />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute requireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/services" element={<AdminServices />} />
            <Route path="/admin/payments" element={<AdminPayments />} />
            <Route path="/admin/personal/notes" element={<PersonalNotes />} />
            <Route path="/admin/personal/tasks" element={<PersonalTasks />} />
          </Route>
        </Route>

        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
