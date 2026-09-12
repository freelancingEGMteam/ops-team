import type { ZodType } from "npm:zod@4.5.4";

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

export async function readJson<T>(
  req: Request,
  schema?: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new Response("Invalid JSON body", { status: 400 });
  }
  if (!schema) return body as T;
  const result = schema.safeParse(body);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
      .join("; ");
    throw new Response(`Invalid request: ${message}`, { status: 400 });
  }
  return result.data;
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
