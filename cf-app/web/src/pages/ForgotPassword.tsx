import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [resetLink, setResetLink] = React.useState("");

  const requestReset = useMutation({
    mutationFn: () => api.auth.requestPasswordReset(email, window.location.origin),
    onSuccess: (data) => {
      setMessage(data.message);
      setResetLink(data.resetLink ?? "");
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Could not create reset link");
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/20">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold">Reset password</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Enter your email to create a reset link.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            setResetLink("");
            requestReset.mutate();
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
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
          {resetLink && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="mb-2 font-medium">Reset link</p>
              <a
                href={resetLink}
                className="break-all text-primary underline-offset-4 hover:underline"
              >
                {resetLink}
              </a>
            </div>
          )}
          <Button type="submit" className="mt-1" disabled={requestReset.isPending}>
            {requestReset.isPending ? "Creating link..." : "Create reset link"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
