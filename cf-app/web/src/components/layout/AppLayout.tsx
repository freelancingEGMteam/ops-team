import { Outlet, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell relative isolate flex min-h-screen flex-col bg-background lg:h-screen lg:flex-row lg:overflow-hidden">
      <Sidebar />
      <main className="app-main relative z-0 min-w-0 flex-1 p-3 sm:p-4 lg:overflow-auto lg:p-6">
        <Outlet />
      </main>
    </div>
  );
}
