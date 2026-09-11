import type { APIRoute } from "astro";
import { createRequestSupabaseClient } from "@/lib/supabase-server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get("code");
  const next = safeNext(context.url.searchParams.get("next"));
  const supabase = createRequestSupabaseClient(context);
  if (!code || !supabase) {
    return context.redirect("/login?reason=callback", 303);
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return context.redirect("/login?reason=callback", 303);
  return context.redirect(next, 303);
};
