import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

type Mode = "login" | "register" | "forgot" | "reset" | "callback";

function safeNext() {
  const value = new URLSearchParams(window.location.search).get("next");
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default function AuthPanel({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (mode === "login") {
      const reason = new URLSearchParams(window.location.search).get("reason");
      if (reason === "expired")
        setMessage("Your session expired. Please sign in again.");
      if (reason === "disabled")
        setMessage("This account is unavailable. Contact support for help.");
      if (reason === "callback")
        setMessage("That sign-in link is invalid or has expired.");
      if (reason === "unavailable")
        setMessage("Account services are not configured yet.");
    }
    if (!supabase || mode !== "callback") return;
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) return setMessage(error.message);
      if (data.session) window.location.replace(safeNext());
      else setMessage("The sign-in link is invalid or has expired.");
    });
  }, [mode, supabase]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase)
      return setMessage("Account services are not configured yet.");
    setPending(true);
    setMessage("");
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setPending(false);
      if (error) return setMessage(error.message);
      window.location.replace(safeNext());
      return;
    }
    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext())}`,
        },
      });
      setPending(false);
      setMessage(
        error ? error.message : "Check your email to verify the new account.",
      );
      return;
    }
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      setPending(false);
      setMessage(
        error
          ? error.message
          : "If that account exists, a reset link has been sent.",
      );
      return;
    }
    if (mode === "reset") {
      const { error } = await supabase.auth.updateUser({ password });
      setPending(false);
      if (error) return setMessage(error.message);
      setMessage("Password updated. Redirecting…");
      window.setTimeout(() => window.location.replace("/account"), 900);
    }
  }

  async function google() {
    if (!supabase)
      return setMessage("Account services are not configured yet.");
    const next = safeNext();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) setMessage(error.message);
  }

  if (mode === "callback")
    return (
      <div className="auth-shell">
        <h1>Completing sign-in</h1>
        <p>{message || "Verifying your account…"}</p>
      </div>
    );

  const titles = {
    login: "Welcome back",
    register: "Create your account",
    forgot: "Reset your password",
    reset: "Choose a new password",
  } as const;
  const descriptions = {
    login: "Sign in to reach your orders and lifetime download library.",
    register: "An account is required for paid and free digital resources.",
    forgot: "We will send a secure reset link to your email.",
    reset: "Use a strong password you have not used elsewhere.",
  } as const;
  return (
    <div className="auth-shell">
      <h1>{titles[mode]}</h1>
      <p>{descriptions[mode]}</p>
      {(mode === "login" || mode === "register") && (
        <>
          <button
            className="btn btn-ghost google-button"
            type="button"
            onClick={() => void google()}
          >
            Continue with Google
          </button>
          <div className="oauth-separator">or use email</div>
        </>
      )}
      <form className="form-stack" onSubmit={submit}>
        {mode === "register" && (
          <label className="field">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </label>
        )}
        {mode !== "reset" && (
          <label className="field">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
        )}
        {mode !== "forgot" && (
          <label className="field">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={10}
              required
            />
          </label>
        )}
        <button className="btn btn-solid" type="submit" disabled={pending}>
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : mode === "register"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Update password"}
        </button>
        {message && (
          <p
            className={
              message.includes("sent") || message.includes("updated")
                ? "form-success"
                : "form-error"
            }
            role="status"
          >
            {message}
          </p>
        )}
      </form>
      <div className="auth-links">
        {mode === "login" ? (
          <>
            <a href="/forgot-password">Forgot password?</a>
            <a href="/register">Create account</a>
          </>
        ) : mode === "register" ? (
          <a href="/login">Already have an account?</a>
        ) : (
          <a href="/login">Return to sign in</a>
        )}
      </div>
      <style>{`.google-button{width:100%;justify-content:center}.form-stack>.btn{justify-content:center}`}</style>
    </div>
  );
}
