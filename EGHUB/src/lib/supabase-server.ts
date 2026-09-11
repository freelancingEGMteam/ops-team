import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { APIContext } from "astro";

function requestCookies(request: Request) {
  const header = request.headers.get("cookie") || "";
  return header
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separator = entry.indexOf("=");
      const name = separator < 0 ? entry : entry.slice(0, separator);
      const rawValue = separator < 0 ? "" : entry.slice(separator + 1);
      try {
        return { name, value: decodeURIComponent(rawValue) };
      } catch {
        return { name, value: rawValue };
      }
    });
}

export function createRequestSupabaseClient(
  context: Pick<APIContext, "request" | "cookies">,
) {
  const url = import.meta.env.PUBLIC_SUPABASE_URL;
  const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  return createServerClient(url, key, {
    cookies: {
      getAll: () => requestCookies(context.request),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          context.cookies.set(name, value, {
            ...(options as CookieOptionsWithName),
            path: options.path || "/",
          });
        });
      },
    },
  });
}
