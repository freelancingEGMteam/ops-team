import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireUser(req);
    const { entitlementId } = await readJson<{ entitlementId: string }>(req);
    const { data: entitlement } = await admin
      .from("download_entitlements")
      .select("*,media_assets(*)")
      .eq("id", entitlementId)
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .single();
    if (!entitlement?.media_assets)
      return json(req, { error: "Download unavailable" }, 404);
    const expiresIn = 600;
    const { data, error } = await admin.storage
      .from(entitlement.media_assets.bucket)
      .createSignedUrl(entitlement.media_assets.path, expiresIn, {
        download: entitlement.media_assets.title,
      });
    if (error) throw error;
    await admin
      .from("download_events")
      .insert({ entitlement_id: entitlement.id, user_id: user.id });
    await audit(
      admin,
      user.id,
      "download.url_created",
      "download_entitlements",
      entitlement.id,
    );
    return json(req, {
      url: data.signedUrl,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });
  } catch (error) {
    return functionError(req, error, "Download failed");
  }
});
