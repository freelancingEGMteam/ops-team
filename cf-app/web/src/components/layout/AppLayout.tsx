import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden bg-background md:h-screen md:flex-row">
      <Sidebar />
      <main className="relative z-0 min-w-0 flex-1 overflow-auto p-3 sm:p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
