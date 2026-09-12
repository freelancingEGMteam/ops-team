import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/types/domain";
import { canPublish, publishStatuses } from "@/types/domain";
import MediaPicker from "./MediaPicker";

type Client = SupabaseClient<any>;

interface VariantDraft {
  id?: string;
  label: string;
  kind: string;
  price: string;
  is_active: boolean;
  mediaIds: string[];
  stripe_price_id?: string | null;
}

const variantKinds = [
  "bundle",
  "album_mp3",
  "album_chords",
  "album_lyrics",
  "track_mp3",
  "track_chords",
  "free",
  "donation",
];

const productDefaults = {
  title: "",
  slug: "",
  description: "",
  tag: "",
  cover_asset_id: "",
  album_id: "",
  track_id: "",
  stripe_tax_code: "txcd_10202000",
  status: "draft",
};

function emptyVariant(): VariantDraft {
  return {
    label: "",
    kind: "bundle",
    price: "0.00",
    is_active: true,
    mediaIds: [],
    stripe_price_id: null,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function toCents(price: string) {
  const amount = Number.parseFloat(price);
  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

export default function ProductsAdmin({
  profile,
  supabase,
}: {
  profile: Profile;
  supabase: Client;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({ ...productDefaults });
  const [variants, setVariants] = useState<VariantDraft[]>([emptyVariant()]);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    void supabase
      .from("products")
      .select("*, product_variants(id, product_items(id))")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        else setRows((data || []) as any[]);
      });
  useEffect(load, [supabase]);

  function startNew() {
    setEditing(null);
    setDraft({ ...productDefaults });
    setVariants([emptyVariant()]);
    setMessage("");
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setEditing(null);
    setDraft({ ...productDefaults });
    setVariants([emptyVariant()]);
  }

  async function edit(row: any) {
    const { data } = await supabase
      .from("product_variants")
      .select("*, product_items(media_asset_id)")
      .eq("product_id", row.id)
      .order("sort_order");
    setVariants(
      data?.length
        ? data.map((variant: any) => ({
            id: variant.id,
            label: variant.label || "",
            kind: variant.kind,
            price: (variant.price_cents / 100).toFixed(2),
            is_active: variant.is_active,
            stripe_price_id: variant.stripe_price_id,
            mediaIds: (variant.product_items || []).map(
              (item: any) => item.media_asset_id,
            ),
          }))
        : [emptyVariant()],
    );
    setEditing(row.id);
    setDraft({ ...row });
    setMessage("");
    setOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    setVariants((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function setTitle(title: string) {
    setDraft((current: any) => ({
      ...current,
      title,
      // Only auto-fill the slug for new products whose slug is untouched.
      slug: !editing && !current.slugTouched ? slugify(title) : current.slug,
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = { ...draft };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.slugTouched;
    delete payload.product_variants;
    delete payload.merged_into_product_id;

    if (payload.status === "published" && !canPublish(profile.role)) {
      payload.status = "review";
      setMessage(
        "Editors can submit for review; an owner or admin must publish.",
      );
    }
    if (payload.status === "published") {
      payload.published_at = payload.published_at || new Date().toISOString();
      payload.scheduled_for = null;
    } else if (["draft", "review"].includes(payload.status)) {
      payload.published_at = null;
      payload.scheduled_for = null;
    } else if (payload.status === "archived") {
      payload.scheduled_for = null;
    }
    if (payload.status === "scheduled" && !payload.scheduled_for) {
      return setMessage("Choose a future publication date before scheduling.");
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });

    if (["published", "scheduled"].includes(payload.status)) {
      if (!payload.cover_asset_id)
        return setMessage("Add cover artwork before releasing this product.");
      const hasDeliverable = variants.some(
        (variant) => variant.kind === "donation" || variant.mediaIds.length,
      );
      if (!hasDeliverable)
        return setMessage(
          "Attach at least one file to a variant before releasing this product.",
        );
      if (variants.some((v) => toCents(v.price) > 0 && !v.stripe_price_id))
        return setMessage(
          "Save as a draft and sync Stripe before releasing a paid variant.",
        );
    }
    if (
      variants.some((variant) => toCents(variant.price) > 0) &&
      !payload.stripe_tax_code
    ) {
      return setMessage(
        "A Stripe tax code is required before saving a product with a paid variant.",
      );
    }

    setSaving(true);
    const result = editing
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", editing)
          .select("id")
          .single()
      : await supabase.from("products").insert(payload).select("id").single();
    if (result.error) {
      setSaving(false);
      return setMessage(result.error.message);
    }
    const productId = result.data.id as string;

    // A variant carries Stripe price history and download entitlements, so
    // it is updated in place or deleted only when explicitly removed here,
    // never blindly recreated.
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId);
    const keptIds = new Set(
      variants.filter((variant) => variant.id).map((variant) => variant.id!),
    );
    const removedIds = (existingVariants || [])
      .map((variant: any) => variant.id as string)
      .filter((id) => !keptIds.has(id));
    if (removedIds.length) {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .in("id", removedIds);
      if (error) {
        setSaving(false);
        return setMessage(error.message);
      }
    }

    for (const [index, variant] of variants.entries()) {
      const variantPayload = {
        product_id: productId,
        label: variant.label.trim() || null,
        kind: variant.kind,
        price_cents: toCents(variant.price),
        is_active: variant.is_active,
        sort_order: index,
      };
      const variantResult = variant.id
        ? await supabase
            .from("product_variants")
            .update(variantPayload)
            .eq("id", variant.id)
            .select("id")
            .single()
        : await supabase
            .from("product_variants")
            .insert(variantPayload)
            .select("id")
            .single();
      if (variantResult.error) {
        setSaving(false);
        return setMessage(variantResult.error.message);
      }
      const variantId = variantResult.data.id as string;
      const { error: removeItemsError } = await supabase
        .from("product_items")
        .delete()
        .eq("variant_id", variantId);
      if (removeItemsError) {
        setSaving(false);
        return setMessage(removeItemsError.message);
      }
      if (variant.mediaIds.length) {
        const { error: itemError } = await supabase
          .from("product_items")
          .insert(
            variant.mediaIds.map((mediaAssetId) => ({
              variant_id: variantId,
              media_asset_id: mediaAssetId,
            })),
          );
        if (itemError) {
          setSaving(false);
          return setMessage(itemError.message);
        }
      }
    }

    setSaving(false);
    setMessage("Saved.");
    close();
    load();
  }

  async function remove(id: string) {
    if (
      !window.confirm(
        "Delete this product and all its variants? Published or referenced records may be rejected.",
      )
    )
      return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    setMessage(error?.message || "Deleted.");
    load();
  }

  async function syncStripe(id: string) {
    setMessage("Syncing Stripe…");
    const { error } = await supabase.functions.invoke("sync-stripe-product", {
      body: { productId: id },
    });
    setMessage(error?.message || "Stripe prices synchronized.");
    load();
  }

  return (
    <>
      <header className="portal-header">
        <div>
          <span className="eyebrow">Catalog</span>
          <h1>Products</h1>
          <p>
            Upload files directly onto each purchase option. A product is only
            sellable once its variants have files attached.
          </p>
        </div>
        {!open && (
          <button className="btn btn-solid" type="button" onClick={startNew}>
            New product
          </button>
        )}
      </header>

      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}

      {open ? (
        <form className="product-editor" onSubmit={save}>
          <div className="product-editor-main">
            <section className="panel">
              <h2>Product details</h2>
              <label className="field">
                Title
                <input
                  type="text"
                  required
                  value={draft.title || ""}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </label>
              <label className="field">
                Page address
                <input
                  type="text"
                  required
                  value={draft.slug || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      slug: event.target.value,
                      slugTouched: true,
                    })
                  }
                />
                <small>/resources/{draft.slug || "…"}</small>
              </label>
              <label className="field">
                Description
                <textarea
                  rows={6}
                  value={draft.description || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
              </label>
            </section>

            <section className="panel">
              <h2>Cover artwork</h2>
              <p className="panel-hint">
                Shown on the product page and catalog cards. Public file.
              </p>
              <MediaPicker
                supabase={supabase}
                profile={profile}
                bucket="public-media"
                defaultKind="cover"
                multiple={false}
                value={draft.cover_asset_id ? [draft.cover_asset_id] : []}
                onChange={(ids) =>
                  setDraft({ ...draft, cover_asset_id: ids[0] || "" })
                }
                emptyLabel="No cover artwork yet."
              />
            </section>

            <section className="panel">
              <h2>Purchase options</h2>
              <p className="panel-hint">
                Each option appears as a choice on one product page — for
                example MP3 Album, Chord Sheet, or a bundle of both.
              </p>
              {variants.map((variant, index) => (
                <div
                  className="variant-card"
                  key={variant.id || `new-${index}`}
                >
                  <div className="variant-card-head">
                    <strong>{variant.label || `Option ${index + 1}`}</strong>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        className="button-danger"
                        onClick={() =>
                          setVariants((current) =>
                            current.filter((_, i) => i !== index),
                          )
                        }
                      >
                        Remove option
                      </button>
                    )}
                  </div>
                  <div className="variant-card-grid">
                    <label className="field">
                      Option name
                      <input
                        type="text"
                        placeholder="MP3 + Chord Sheet"
                        value={variant.label}
                        onChange={(event) =>
                          updateVariant(index, { label: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Price (USD)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={variant.price}
                        onChange={(event) =>
                          updateVariant(index, { price: event.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      Type
                      <select
                        value={variant.kind}
                        onChange={(event) =>
                          updateVariant(index, { kind: event.target.value })
                        }
                      >
                        {variantKinds.map((kind) => (
                          <option key={kind}>{kind}</option>
                        ))}
                      </select>
                    </label>
                    <label className="field checkbox-field">
                      <input
                        type="checkbox"
                        checked={variant.is_active}
                        onChange={(event) =>
                          updateVariant(index, {
                            is_active: event.target.checked,
                          })
                        }
                      />
                      Available for sale
                    </label>
                  </div>
                  <div className="field">
                    Files the buyer receives
                    <MediaPicker
                      supabase={supabase}
                      profile={profile}
                      bucket="private-downloads"
                      defaultKind="bundle"
                      value={variant.mediaIds}
                      onChange={(ids) =>
                        updateVariant(index, { mediaIds: ids })
                      }
                      emptyLabel="No files attached — this option cannot be bought yet."
                    />
                  </div>
                  {variant.stripe_price_id && (
                    <p className="variant-stripe">
                      Stripe price <code>{variant.stripe_price_id}</code>
                    </p>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  setVariants((current) => [...current, emptyVariant()])
                }
              >
                + Add another option
              </button>
            </section>
          </div>

          <aside className="product-editor-side">
            <section className="panel">
              <h2>Status</h2>
              <label className="field">
                Visibility
                <select
                  value={draft.status || "draft"}
                  onChange={(event) =>
                    setDraft({ ...draft, status: event.target.value })
                  }
                >
                  {publishStatuses
                    .filter(
                      (status) =>
                        canPublish(profile.role) ||
                        !["published", "scheduled", "archived"].includes(
                          status,
                        ),
                    )
                    .map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                </select>
              </label>
              {draft.status === "scheduled" && (
                <label className="field">
                  Publish at
                  <input
                    type="datetime-local"
                    value={
                      draft.scheduled_for
                        ? new Date(draft.scheduled_for)
                            .toISOString()
                            .slice(0, 16)
                        : ""
                    }
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        scheduled_for: event.target.value
                          ? new Date(event.target.value).toISOString()
                          : null,
                      })
                    }
                    required
                  />
                </label>
              )}
              <div className="button-row">
                <button
                  className="btn btn-solid"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving…" : editing ? "Save changes" : "Create"}
                </button>
                <button
                  className="btn btn-ghost"
                  type="button"
                  onClick={close}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </section>

            <section className="panel">
              <h2>Organisation</h2>
              <label className="field">
                Catalog tag
                <input
                  type="text"
                  value={draft.tag || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, tag: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Related album ID
                <input
                  type="text"
                  value={draft.album_id || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, album_id: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Related track ID
                <input
                  type="text"
                  value={draft.track_id || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, track_id: event.target.value })
                  }
                />
              </label>
            </section>

            <section className="panel">
              <h2>Stripe</h2>
              <label className="field">
                Tax code
                <input
                  type="text"
                  value={draft.stripe_tax_code || ""}
                  onChange={(event) =>
                    setDraft({ ...draft, stripe_tax_code: event.target.value })
                  }
                />
              </label>
              <p className="panel-hint">
                Save first, then use Sync Stripe on the product list to create
                prices for paid options.
              </p>
            </section>
          </aside>
        </form>
      ) : (
        <section className="panel">
          <h2>All products</h2>
          {rows.length ? (
            <div className="table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Options</th>
                    <th>Files</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rowVariants = row.product_variants || [];
                    const withFiles = rowVariants.filter(
                      (variant: any) => (variant.product_items || []).length,
                    ).length;
                    return (
                      <tr key={row.id}>
                        <td data-label="Title">{row.title}</td>
                        <td data-label="Options">{rowVariants.length}</td>
                        <td data-label="Files">
                          {rowVariants.length && withFiles === 0 ? (
                            <span className="files-missing">None attached</span>
                          ) : (
                            <span>
                              {withFiles} of {rowVariants.length}
                            </span>
                          )}
                        </td>
                        <td data-label="Status">
                          <span className="status-pill">{row.status}</span>
                        </td>
                        <td data-label="Actions">
                          <div className="button-row">
                            {(canPublish(profile.role) ||
                              ["draft", "review"].includes(row.status)) && (
                              <button onClick={() => void edit(row)}>
                                Edit
                              </button>
                            )}
                            {canPublish(profile.role) && (
                              <button onClick={() => void syncStripe(row.id)}>
                                Sync Stripe
                              </button>
                            )}
                            {(canPublish(profile.role) ||
                              ["draft", "review"].includes(row.status)) && (
                              <button
                                className="button-danger"
                                onClick={() => void remove(row.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No products yet.</p>
          )}
        </section>
      )}

      <style>{`
        .product-editor{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}
        .product-editor-main{display:grid;gap:20px;min-width:0}
        .product-editor-side{display:grid;gap:20px;position:sticky;top:98px}
        .product-editor .panel{margin-top:0}
        .product-editor .field{margin-top:14px}
        .product-editor .field small{color:var(--ink-soft);font-weight:400;font-size:.78rem}
        .panel-hint{color:var(--ink-soft);font-size:.85rem;margin-top:6px}
        .variant-card{border:1px solid var(--line);border-radius:10px;padding:14px;margin-top:14px;display:grid;gap:12px}
        .variant-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .variant-card-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .variant-card .field{margin-top:0}
        .checkbox-field{display:flex;flex-direction:row;align-items:center;gap:8px}
        .variant-stripe{color:var(--ink-soft);font-size:.8rem;margin:0}
        .files-missing{color:var(--red)}
        @media(max-width:1000px){.product-editor{grid-template-columns:1fr}.product-editor-side{position:static}}
        @media(max-width:700px){.variant-card-grid{grid-template-columns:1fr}}
      `}</style>
    </>
  );
}
