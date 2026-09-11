import { audit, requireStaff } from "../_shared/auth.ts";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireStaff(req, [
      "owner",
      "admin",
      "editor",
    ]);
    const { mediaId } = await readJson<{ mediaId: string }>(req);
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        mediaId,
      )
    )
      return json(req, { error: "Invalid media ID" }, 400);
    const { data: media } = await admin
      .from("media_assets")
      .select("*")
      .eq("id", mediaId)
      .single();
    if (!media) return json(req, { error: "Media not found" }, 404);

    const referenceChecks = await Promise.all([
      admin
        .from("albums")
        .select("id")
        .or(`cover_asset_id.eq.${mediaId},preview_asset_id.eq.${mediaId}`)
        .limit(1),
      admin
        .from("tracks")
        .select("id")
        .or(
          `audio_asset_id.eq.${mediaId},preview_asset_id.eq.${mediaId},chord_pdf_asset_id.eq.${mediaId},lyrics_pdf_asset_id.eq.${mediaId}`,
        )
        .limit(1),
      admin
        .from("episodes")
        .select("id")
        .or(`hero_video_asset_id.eq.${mediaId},poster_asset_id.eq.${mediaId}`)
        .limit(1),
      admin
        .from("products")
        .select("id")
        .eq("cover_asset_id", mediaId)
        .limit(1),
      admin
        .from("product_items")
        .select("id")
        .eq("media_asset_id", mediaId)
        .limit(1),
    ]);
    if (referenceChecks.some(({ data }) => Boolean(data?.length))) {
      return json(
        req,
        { error: "Remove this asset from every record before deleting it" },
        409,
      );
    }

    const { error: storageError } = await admin.storage
      .from(media.bucket)
      .remove([media.path]);
    if (storageError) throw storageError;
    const { error: databaseError } = await admin
      .from("media_assets")
      .delete()
      .eq("id", media.id);
    if (databaseError) throw databaseError;
    await audit(admin, user.id, "media.deleted", "media_assets", media.id, {
      bucket: media.bucket,
      path: media.path,
    });
    return json(req, { deleted: true });
  } catch (error) {
    return functionError(req, error, "Media deletion failed");
  }
});
