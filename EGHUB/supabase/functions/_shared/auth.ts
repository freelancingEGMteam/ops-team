import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2.114.0";

export type StaffRole = "owner" | "admin" | "editor" | "support";

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SECRET_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export async function requireUser(
  req: Request,
): Promise<{ user: User; admin: SupabaseClient; role: string }> {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Response("Unauthorized", { status: 401 });
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Response("Unauthorized", { status: 401 });
  const { data: profile } = await admin
    .from("profiles")
    .select("role,status")
    .eq("id", data.user.id)
    .single();
  if (!profile || profile.status !== "active")
    throw new Response("Account unavailable", { status: 403 });
  return { user: data.user, admin, role: profile.role };
}

export async function requireStaff(req: Request, roles: StaffRole[]) {
  const context = await requireUser(req);
  if (!roles.includes(context.role as StaffRole))
    throw new Response("Forbidden", { status: 403 });
  return context;
}

export async function audit(
  admin: SupabaseClient,
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {},
) {
  await admin.from("audit_log").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}
