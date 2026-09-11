export const corsHeaders = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function withCors(req: Request, headers: HeadersInit = {}) {
  const allowed = Deno.env.get("SITE_URL") || "http://localhost:4321";
  const origin = req.headers.get("Origin");
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    ...headers,
  };
}

export function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: withCors(req, { "Content-Type": "application/json" }),
  });
}

export function handleOptions(req: Request) {
  return req.method === "OPTIONS"
    ? new Response("ok", { headers: withCors(req) })
    : null;
}

export async function readJson<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export async function functionError(
  req: Request,
  error: unknown,
  fallback: string,
) {
  if (error instanceof Response) {
    return json(req, { error: (await error.text()) || fallback }, error.status);
  }
  console.error(error);
  return json(
    req,
    { error: error instanceof Error ? error.message : fallback },
    500,
  );
}
