import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Profile } from "@/types/domain";

export function usePortalProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const supabase = getSupabaseBrowserClient();
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setError("Account services are not configured.");
      return;
    }
    void (async () => {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        window.location.replace(
          `/login?next=${encodeURIComponent(window.location.pathname)}`,
        );
        return;
      }
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (profileError || !data)
        setError(profileError?.message || "Profile not found.");
      else if ((data as Profile).status === "disabled")
        setError("This account has been disabled. Contact support for help.");
      else setProfile(data as Profile);
      setLoading(false);
    })();
  }, [supabase]);
  return { profile, setProfile, loading, error, supabase };
}

export function PortalLoading({
  message = "Loading your account…",
}: {
  message?: string;
}) {
  return (
    <div className="auth-shell">
      <h1>Please wait</h1>
      <p>{message}</p>
    </div>
  );
}

export function PortalError({ message }: { message: string }) {
  return (
    <div className="auth-shell">
      <h1>Access unavailable</h1>
      <p className="form-error">{message}</p>
      <div className="button-row">
        <a className="btn btn-solid" href="/contact">
          Contact support
        </a>
        <a className="btn btn-ghost" href="/">
          Return home
        </a>
      </div>
    </div>
  );
}
