import * as React from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const resetPassword = useMutation({
    mutationFn: () => api.auth.confirmPasswordReset(token, password),
    onSuccess: () => {
      setSuccess(true);
      window.setTimeout(() => navigate("/login", { replace: true }), 1500);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Could not reset password");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">Choose new password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter a new password for your account.
        </p>

        {!token ? (
          <div className="space-y-4">
            <p className="text-sm text-destructive">This reset link is missing a token.</p>
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              Create a new reset link
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (password !== confirmPassword) {
                setError("Passwords do not match");
                return;
              }
              resetPassword.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <Input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            {success && (
              <p className="text-sm text-emerald-600">
                Password updated. Sending you back to sign in...
              </p>
            )}
            <Button type="submit" className="mt-1" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
