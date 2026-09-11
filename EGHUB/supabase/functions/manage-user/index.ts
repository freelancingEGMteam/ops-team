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
    const { userId, action, role } = await readJson<{
      userId: string;
      action: "disable" | "enable" | "role";
      role?: string;
    }>(req);
    if (userId === user.id)
      return json(
        req,
        { error: "You cannot manage your own access here" },
        400,
      );
    const { data: target } = await admin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (!target) return json(req, { error: "Account not found" }, 404);
    if (target.role === "owner")
      return json(req, { error: "The owner account is protected" }, 403);
    if (actorRole !== "owner" && target.role === "admin")
      return json(req, { error: "Only the owner can manage admins" }, 403);
    if (action === "role") {
      if (target.role === "customer" && role !== "customer")
        return json(
          req,
          { error: "Staff roles can only be created through an invitation" },
          403,
        );
      const allowed =
        actorRole === "owner"
          ? ["admin", "editor", "support", "customer"]
          : ["editor", "support", "customer"];
      if (!role || !allowed.includes(role))
        return json(req, { error: "Role is not allowed" }, 403);
      await admin.from("profiles").update({ role }).eq("id", userId);
    } else {
      const disabled = action === "disable";
      await admin
        .from("profiles")
        .update({ status: disabled ? "disabled" : "active" })
        .eq("id", userId);
      const { error } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: disabled ? "876000h" : "none",
      });
      if (error) throw error;
    }
    await audit(
      admin,
      user.id,
      `user.${action}`,
      "profiles",
      userId,
      role ? { role } : {},
    );
    return json(req, { updated: true });
  } catch (error) {
    return functionError(req, error, "Account update failed");
  }
});
