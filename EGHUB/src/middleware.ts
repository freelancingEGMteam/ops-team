import { defineMiddleware } from "astro:middleware";
import { createRequestSupabaseClient } from "@/lib/supabase-server";
import { isStaff, type Profile } from "@/types/domain";

function isProtectedPath(pathname: string) {
  return (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  if (!isProtectedPath(pathname)) return next();

  const loginUrl = new URL("/login", context.url);
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  const supabase = createRequestSupabaseClient(context);
  if (!supabase) {
    loginUrl.searchParams.set("reason", "unavailable");
    return context.redirect(loginUrl.toString(), 303);
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    loginUrl.searchParams.set("reason", "expired");
    return context.redirect(loginUrl.toString(), 303);
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .maybeSingle();
  const profile = profileData as Profile | null;
  if (!profile || profile.status !== "active") {
    await supabase.auth.signOut();
    loginUrl.searchParams.set("reason", "disabled");
    return context.redirect(loginUrl.toString(), 303);
  }

  if (
    (pathname === "/admin" || pathname.startsWith("/admin/")) &&
    !isStaff(profile.role)
  ) {
    return context.redirect("/account?notice=staff-required", 303);
  }

  return next();
});
