import * as React from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const login = useMutation({
    mutationFn: () => api.auth.login(email, password),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      navigate("/", { replace: true });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Login failed");
    },
  });

  if (isAuthenticated()) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">Welcome back</h1>
        <p className="mb-6 text-sm text-muted-foreground">Sign in to your workspace</p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            login.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="mt-1" disabled={login.isPending}>
            {login.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link to="/register" className="text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
