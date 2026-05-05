import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/pages/Dashboard";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { ForgotPasswordPage } from "@/pages/ForgotPassword";
import { ResetPasswordPage } from "@/pages/ResetPassword";
import { NewProjectPage } from "@/pages/Projects";
import { ProjectDetailPage } from "@/pages/ProjectDetail";
import { UsersPage } from "@/pages/Users";
import { TimeTrackerPage } from "@/pages/TimeTracker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/projects/new" element={<NewProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/time-tracker" element={<TimeTrackerPage />} />
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
