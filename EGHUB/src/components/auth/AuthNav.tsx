import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Profile } from "@/types/domain";

export default function AuthNav() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return;
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return setProfile(null);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      setProfile(data as Profile | null);
    };
    void load();
    const { data } = supabase.auth.onAuthStateChange(() => void load());
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  if (!supabase) return <a href="/login">Sign in</a>;
  if (!profile) return <a href="/login">Sign in</a>;
  return (
    <>
      <a href="/account">Account</a>
      {profile.role !== "customer" && <a href="/admin">Admin</a>}
    </>
  );
}
