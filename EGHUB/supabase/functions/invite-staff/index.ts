import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireStaff } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const {
      user,
      admin,
      role: actorRole,
    } = await requireStaff(req, ["owner", "admin"]);
    const { email, role } = await readJson<{
      email: string;
      role: "admin" | "editor" | "support";
    }>(req);
    const allowed =
      actorRole === "owner"
        ? ["admin", "editor", "support"]
        : ["editor", "support"];
    if (!allowed.includes(role))
      return json(req, { error: "You cannot invite that role" }, 403);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: invite, error } = await admin
      .from("admin_invites")
      .upsert(
        {
          email: email.trim().toLowerCase(),
          role,
          invited_by: user.id,
          expires_at: expiresAt,
          accepted_at: null,
        },
        { onConflict: "email" },
      )
      .select("*")
      .single();
    if (error) throw error;
    const site = Deno.env.get("SITE_URL") || "http://localhost:4321";
    const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo: `${site}/auth/callback?next=/admin`,
        data: { invited_role: role },
      },
    );
    if (inviteError) throw inviteError;
    await audit(admin, user.id, "staff.invited", "admin_invites", invite.id, {
      email,
      role,
    });
    return json(req, { invited: true });
  } catch (error) {
    return functionError(req, error, "Invitation failed");
  }
});
