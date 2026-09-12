import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import * as tus from "tus-js-client";
import {
  Activity,
  BookOpen,
  Film,
  Gauge,
  Library,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Upload,
  UsersRound,
} from "lucide-react";
import { formatMoney } from "@/lib/catalog";
import type { Json } from "@/types/database.generated";
import type { Order, OrderItem, Profile, UserRole } from "@/types/domain";
import { canPublish, isStaff, publishStatuses } from "@/types/domain";
import { PortalError, PortalLoading, usePortalProfile } from "./PortalState";

type Client = SupabaseClient<any>;
type Section = {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  roles: UserRole[];
};
const sections: Section[] = [
  {
    key: "overview",
    label: "Overview",
    icon: Gauge,
    roles: ["owner", "admin", "editor", "support"],
  },
  {
    key: "media",
    label: "Media",
    icon: Upload,
    roles: ["owner", "admin", "editor"],
  },
  {
    key: "albums",
    label: "Albums",
    icon: Library,
    roles: ["owner", "admin", "editor"],
  },
  {
    key: "tracks",
    label: "Tracks",
    icon: BookOpen,
    roles: ["owner", "admin", "editor"],
  },
  {
    key: "videos",
    label: "Videos",
    icon: Film,
    roles: ["owner", "admin", "editor"],
  },
  {
    key: "products",
    label: "Products",
    icon: ShoppingBag,
    roles: ["owner", "admin", "editor"],
  },
  {
    key: "orders",
    label: "Orders",
    icon: Package,
    roles: ["owner", "admin", "support"],
  },
  {
    key: "customers",
    label: "Customers",
    icon: UsersRound,
    roles: ["owner", "admin", "support"],
  },
  {
    key: "staff",
    label: "Staff",
    icon: ShieldCheck,
    roles: ["owner", "admin"],
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    roles: ["owner", "admin"],
  },
  { key: "audit", label: "Audit", icon: Activity, roles: ["owner", "admin"] },
];

export default function AdminPortal() {
  const { profile, loading, error, supabase } = usePortalProfile();
  const path =
    typeof window === "undefined"
      ? "/admin"
      : window.location.pathname.replace(/\/$/, "") || "/admin";
  const key = path.split("/")[2] || "overview";
  if (loading) return <PortalLoading message="Loading staff workspace…" />;
  if (error || !profile || !supabase)
    return <PortalError message={error || "Staff profile unavailable."} />;
  if (!isStaff(profile.role))
    return (
      <PortalError message="This area is available only to invited staff." />
    );
  const allowed = sections.filter((section) =>
    section.roles.includes(profile.role),
  );
  const active = allowed.some((section) => section.key === key)
    ? key
    : "overview";
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <strong>Staff workspace</strong>
        <nav className="portal-nav">
          {allowed.map(({ key: navKey, label, icon: Icon }) => (
            <a
              key={navKey}
              href={navKey === "overview" ? "/admin" : `/admin/${navKey}`}
              className={active === navKey ? "active" : ""}
            >
              <Icon size={16} /> {label}
            </a>
          ))}
        </nav>
        <button
          className="btn btn-ghost admin-signout"
          onClick={() =>
            void supabase.auth
              .signOut()
              .then(() => window.location.replace("/"))
          }
        >
          <LogOut size={16} /> Sign out
        </button>
      </aside>
      <div className="portal-main">
        <AdminRoute section={active} profile={profile} supabase={supabase} />
      </div>
      <style>{`.portal-nav a,.admin-signout{display:flex;align-items:center;gap:9px}.admin-signout{width:100%;margin-top:14px;justify-content:center}`}</style>
    </div>
  );
}

function AdminRoute({
  section,
  profile,
  supabase,
}: {
  section: string;
  profile: Profile;
  supabase: Client;
}) {
  if (section === "media")
    return <MediaAdmin profile={profile} supabase={supabase} />;
  if (section === "albums")
    return <ContentAdmin kind="albums" profile={profile} supabase={supabase} />;
  if (section === "tracks")
    return <ContentAdmin kind="tracks" profile={profile} supabase={supabase} />;
  if (section === "videos")
    return (
      <ContentAdmin kind="episodes" profile={profile} supabase={supabase} />
    );
  if (section === "products")
    return <ProductsAdmin profile={profile} supabase={supabase} />;
  if (section === "orders") return <OrdersAdmin supabase={supabase} />;
  if (section === "customers")
    return (
      <PeopleAdmin mode="customers" profile={profile} supabase={supabase} />
    );
  if (section === "staff")
    return <PeopleAdmin mode="staff" profile={profile} supabase={supabase} />;
  if (section === "settings")
    return <SettingsAdmin profile={profile} supabase={supabase} />;
  if (section === "audit") return <AuditAdmin supabase={supabase} />;
  return <Overview profile={profile} supabase={supabase} />;
}

function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="portal-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </header>
  );
}

function Overview({
  profile,
  supabase,
}: {
  profile: Profile;
  supabase: Client;
}) {
  const [stats, setStats] = useState<Record<string, number>>({});
  useEffect(() => {
    void Promise.all(
      [
        "albums",
        "episodes",
        "products",
        "orders",
        "profiles",
        "media_assets",
      ].map(async (table) => {
        const result = await supabase
          .from(table)
          .select("id", { count: "exact", head: true });
        return [table, result.count || 0] as const;
      }),
    ).then((pairs) => setStats(Object.fromEntries(pairs)));
  }, [supabase]);
  return (
    <>
      <Heading
        eyebrow="Operations"
        title="Dashboard"
        description={`Signed in as ${profile.role}.`}
      />
      <div className="stat-grid">
        {[
          ["Albums", stats.albums],
          ["Videos", stats.episodes],
          ["Products", stats.products],
          ["Orders", stats.orders],
          ["Accounts", stats.profiles],
          ["Media", stats.media_assets],
        ].map(([label, value]) => (
          <div className="stat-card" key={String(label)}>
            <span>{label}</span>
            <strong>{value ?? "—"}</strong>
          </div>
        ))}
      </div>
      <section className="panel">
        <h2>Publishing checks</h2>
        <ul className="admin-checks">
          <li>
            Catalog records must have required media, tax codes, and published
            status before public release.
          </li>
          <li>
            Only owners and admins can publish, schedule, archive, or unpublish.
          </li>
          <li>
            Payment, account, file, and role changes are written to the audit
            log.
          </li>
        </ul>
      </section>
      <style>{`.admin-checks{display:grid;gap:10px;margin:0;padding-left:20px;color:var(--ink-dim)}`}</style>
    </>
  );
}

type ContentKind = "albums" | "tracks" | "episodes";
const contentConfig = {
  albums: {
    title: "Albums",
    description: "Prepare worship releases and send them through review.",
    defaults: {
      title: "",
      slug: "",
      artist: "Eternal Grace Music",
      description: "",
      status: "draft",
      is_featured: false,
    },
  },
  tracks: {
    title: "Tracks",
    description:
      "Add songs to albums and attach protected audio or PDF assets.",
    defaults: {
      title: "",
      album_id: "",
      track_number: 1,
      status: "draft",
      price_mp3_cents: 200,
      price_chords_cents: 200,
    },
  },
  episodes: {
    title: "Videos",
    description:
      "Prepare BibleInVideo episodes, posters, chapters, and publishing status.",
    defaults: {
      title: "",
      slug: "",
      summary: "",
      status: "draft",
      is_featured: false,
    },
  },
} as const;

function ContentAdmin({
  kind,
  profile,
  supabase,
}: {
  kind: ContentKind;
  profile: Profile;
  supabase: Client;
}) {
  const config = contentConfig[kind];
  const [rows, setRows] = useState<any[]>([]);
  const [draft, setDraft] = useState<any>({ ...config.defaults });
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = () =>
    void supabase
      .from(kind)
      .select("*")
      .order(kind === "tracks" ? "track_number" : "created_at", {
        ascending: kind === "tracks",
      })
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        else setRows((data || []) as any[]);
      });
  useEffect(load, [kind, supabase]);
  async function edit(row: any) {
    setEditing(row.id);
    setDraft({ ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = { ...draft };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    if (payload.status === "published" && !canPublish(profile.role)) {
      payload.status = "review";
      setMessage(
        "Editors can submit for review; an owner or admin must publish.",
      );
    }
    if (kind !== "tracks") {
      if (payload.status === "published") {
        payload.published_at = payload.published_at || new Date().toISOString();
        payload.scheduled_for = null;
      } else if (["draft", "review"].includes(payload.status)) {
        payload.published_at = null;
        payload.scheduled_for = null;
      } else if (payload.status === "archived") {
        payload.scheduled_for = null;
      }
    } else if (payload.status !== "scheduled") {
      payload.scheduled_for = null;
    }
    if (payload.status === "scheduled" && !payload.scheduled_for) {
      setMessage("Choose a future publication date before scheduling.");
      return;
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    if (["published", "scheduled"].includes(payload.status)) {
      if (kind === "albums" && !payload.cover_asset_id)
        return setMessage("Attach public cover artwork before release.");
      if (
        kind === "episodes" &&
        (!payload.poster_asset_id || !payload.hero_video_asset_id)
      )
        return setMessage(
          "Attach a public poster and video before releasing an episode.",
        );
    }
    const result = editing
      ? await supabase
          .from(kind)
          .update(payload)
          .eq("id", editing)
          .select("id")
          .single()
      : await supabase.from(kind).insert(payload).select("id").single();
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    setDraft({ ...config.defaults });
    setEditing(null);
    setMessage("Saved.");
    load();
  }
  async function remove(id: string) {
    if (
      !window.confirm(
        "Delete this draft? Published or referenced records may be rejected.",
      )
    )
      return;
    const { error } = await supabase.from(kind).delete().eq("id", id);
    setMessage(error?.message || "Deleted.");
    load();
  }
  return (
    <>
      <Heading
        eyebrow="Catalog"
        title={config.title}
        description={config.description}
      />
      <section className="panel">
        <h2>{editing ? "Edit record" : "New record"}</h2>
        <form className="admin-record-form" onSubmit={save}>
          <ContentFields kind={kind} draft={draft} setDraft={setDraft} />
          <label className="field">
            Status
            <select
              value={draft.status || "draft"}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {publishStatuses
                .filter(
                  (status) =>
                    canPublish(profile.role) ||
                    !["published", "scheduled", "archived"].includes(status),
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
                    ? new Date(draft.scheduled_for).toISOString().slice(0, 16)
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
            <button className="btn btn-solid" type="submit">
              {editing ? "Save changes" : "Create"}
            </button>
            {editing && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft({ ...config.defaults });
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>{config.title}</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug / parent</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Title">{row.title}</td>
                    <td data-label="Slug / parent">
                      {row.slug || row.album_id || "—"}
                    </td>
                    <td data-label="Status">
                      <span className="status-pill">{row.status}</span>
                    </td>
                    <td data-label="Updated">
                      {row.updated_at
                        ? new Date(row.updated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td data-label="Actions">
                      <div className="button-row">
                        {(canPublish(profile.role) ||
                          ["draft", "review"].includes(row.status)) && (
                          <button onClick={() => void edit(row)}>Edit</button>
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No records yet.</p>
        )}
      </section>
      <style>{`.admin-record-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.admin-record-form .wide{grid-column:1/-1}.admin-record-form>.button-row{grid-column:1/-1}@media(max-width:700px){.admin-record-form{grid-template-columns:1fr}.admin-record-form .wide{grid-column:auto}}`}</style>
    </>
  );
}

interface VariantDraft {
  id?: string;
  label: string;
  kind: string;
  price_cents: number;
  is_active: boolean;
  media_asset_ids: string;
  stripe_price_id?: string | null;
}

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

function emptyVariant(): VariantDraft {
  return {
    label: "",
    kind: "bundle",
    price_cents: 0,
    is_active: true,
    media_asset_ids: "",
    stripe_price_id: null,
  };
}

function ProductsAdmin({
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
  const [message, setMessage] = useState("");

  const load = () =>
    void supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setMessage(error.message);
        else setRows((data || []) as any[]);
      });
  useEffect(load, [supabase]);

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
            price_cents: variant.price_cents,
            is_active: variant.is_active,
            stripe_price_id: variant.stripe_price_id,
            media_asset_ids: (variant.product_items || [])
              .map((item: any) => item.media_asset_id)
              .join(", "),
          }))
        : [emptyVariant()],
    );
    setEditing(row.id);
    setDraft({ ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addVariantRow() {
    setVariants((current) => [...current, emptyVariant()]);
  }
  function updateVariantRow(index: number, patch: Partial<VariantDraft>) {
    setVariants((current) =>
      current.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }
  function removeVariantRow(index: number) {
    setVariants((current) => current.filter((_, i) => i !== index));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = { ...draft };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
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
      setMessage("Choose a future publication date before scheduling.");
      return;
    }
    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });
    if (["published", "scheduled"].includes(payload.status)) {
      if (!payload.cover_asset_id)
        return setMessage("Attach public product artwork before release.");
      const hasDeliverable = variants.some(
        (variant) =>
          variant.kind === "donation" || variant.media_asset_ids.trim(),
      );
      if (!variants.length || !hasDeliverable)
        return setMessage(
          "Attach at least one protected deliverable to a variant before releasing this product.",
        );
      if (variants.some((v) => v.price_cents > 0 && !v.stripe_price_id))
        return setMessage(
          "Save as a draft and sync Stripe before releasing a paid variant.",
        );
    }
    if (
      variants.some((variant) => variant.price_cents > 0) &&
      !payload.stripe_tax_code
    ) {
      setMessage(
        "A Stripe tax code is required before saving a product with a paid variant.",
      );
      return;
    }

    const result = editing
      ? await supabase
          .from("products")
          .update(payload)
          .eq("id", editing)
          .select("id")
          .single()
      : await supabase.from("products").insert(payload).select("id").single();
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    const productId = result.data.id as string;

    // Diff variants against what exists today — unlike a product_items join
    // row, a variant carries real weight (Stripe price history, download
    // entitlements), so it's updated in place or deleted only when the
    // staff member explicitly removed its row, never blindly recreated.
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
      if (error) return setMessage(error.message);
    }

    for (const [index, variant] of variants.entries()) {
      const variantPayload = {
        product_id: productId,
        label: variant.label.trim() || null,
        kind: variant.kind,
        price_cents: Number(variant.price_cents) || 0,
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
        setMessage(variantResult.error.message);
        return;
      }
      const variantId = variantResult.data.id as string;
      const mediaAssetIds = variant.media_asset_ids
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);
      const { error: removeItemsError } = await supabase
        .from("product_items")
        .delete()
        .eq("variant_id", variantId);
      if (removeItemsError) return setMessage(removeItemsError.message);
      if (mediaAssetIds.length) {
        const { error: itemError } = await supabase
          .from("product_items")
          .insert(
            mediaAssetIds.map((mediaAssetId) => ({
              variant_id: variantId,
              media_asset_id: mediaAssetId,
            })),
          );
        if (itemError) return setMessage(itemError.message);
      }
    }

    setDraft({ ...productDefaults });
    setVariants([emptyVariant()]);
    setEditing(null);
    setMessage("Saved.");
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
    const { error } = await supabase.functions.invoke("sync-stripe-product", {
      body: { productId: id },
    });
    setMessage(error?.message || "Stripe prices synchronized.");
    load();
  }

  return (
    <>
      <Heading
        eyebrow="Catalog"
        title="Products"
        description="Build downloadable products with one or more purchasable variants, and synchronize approved prices with Stripe."
      />
      <section className="panel">
        <h2>{editing ? "Edit product" : "New product"}</h2>
        <form className="admin-record-form" onSubmit={save}>
          <label className="field">
            Title
            <input
              type="text"
              required
              value={draft.title || ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="field">
            Slug
            <input
              type="text"
              required
              value={draft.slug || ""}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </label>
          <label className="field">
            Stripe tax code
            <input
              type="text"
              value={draft.stripe_tax_code || ""}
              onChange={(e) =>
                setDraft({ ...draft, stripe_tax_code: e.target.value })
              }
            />
          </label>
          <label className="field">
            Catalog tag
            <input
              type="text"
              value={draft.tag || ""}
              onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
            />
          </label>
          <label className="field">
            Public artwork media ID
            <input
              type="text"
              value={draft.cover_asset_id || ""}
              onChange={(e) =>
                setDraft({ ...draft, cover_asset_id: e.target.value })
              }
            />
          </label>
          <label className="field">
            Related album ID
            <input
              type="text"
              value={draft.album_id || ""}
              onChange={(e) => setDraft({ ...draft, album_id: e.target.value })}
            />
          </label>
          <label className="field">
            Related track ID
            <input
              type="text"
              value={draft.track_id || ""}
              onChange={(e) => setDraft({ ...draft, track_id: e.target.value })}
            />
          </label>
          <label className="field wide">
            Description
            <textarea
              value={draft.description || ""}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label className="field">
            Status
            <select
              value={draft.status || "draft"}
              onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            >
              {publishStatuses
                .filter(
                  (status) =>
                    canPublish(profile.role) ||
                    !["published", "scheduled", "archived"].includes(status),
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
                    ? new Date(draft.scheduled_for).toISOString().slice(0, 16)
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

          <div className="wide variants-editor">
            <h3>Variants</h3>
            <p className="variants-hint">
              Each variant is a separate purchasable option under this one
              product page — e.g. MP3 Album, Chord Book, MP3 + Chords Bundle.
            </p>
            {variants.map((variant, index) => (
              <div className="variant-row" key={variant.id || `new-${index}`}>
                <label className="field">
                  Label
                  <input
                    type="text"
                    placeholder="e.g. MP3 + Chords Bundle"
                    value={variant.label}
                    onChange={(e) =>
                      updateVariantRow(index, { label: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Kind
                  <select
                    value={variant.kind}
                    onChange={(e) =>
                      updateVariantRow(index, { kind: e.target.value })
                    }
                  >
                    {variantKinds.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Price (cents)
                  <input
                    type="number"
                    value={variant.price_cents}
                    onChange={(e) =>
                      updateVariantRow(index, {
                        price_cents: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label className="field checkbox-field">
                  <input
                    type="checkbox"
                    checked={variant.is_active}
                    onChange={(e) =>
                      updateVariantRow(index, { is_active: e.target.checked })
                    }
                  />
                  Active
                </label>
                <label className="field wide">
                  Protected deliverable media IDs (comma-separated)
                  <textarea
                    value={variant.media_asset_ids}
                    onChange={(e) =>
                      updateVariantRow(index, {
                        media_asset_ids: e.target.value,
                      })
                    }
                  />
                </label>
                {variant.stripe_price_id && (
                  <p className="variant-stripe-status">
                    Stripe price: <code>{variant.stripe_price_id}</code>
                  </p>
                )}
                <button
                  type="button"
                  className="button-danger"
                  onClick={() => removeVariantRow(index)}
                  disabled={variants.length === 1}
                >
                  Remove variant
                </button>
              </div>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={addVariantRow}
            >
              + Add variant
            </button>
          </div>

          <div className="button-row">
            <button className="btn btn-solid" type="submit">
              {editing ? "Save changes" : "Create"}
            </button>
            {editing && (
              <button
                className="btn btn-ghost"
                type="button"
                onClick={() => {
                  setEditing(null);
                  setDraft({ ...productDefaults });
                  setVariants([emptyVariant()]);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
      </section>
      <section className="panel">
        <h2>Products</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Slug</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Title">{row.title}</td>
                    <td data-label="Slug">{row.slug}</td>
                    <td data-label="Status">
                      <span className="status-pill">{row.status}</span>
                    </td>
                    <td data-label="Updated">
                      {row.updated_at
                        ? new Date(row.updated_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td data-label="Actions">
                      <div className="button-row">
                        {(canPublish(profile.role) ||
                          ["draft", "review"].includes(row.status)) && (
                          <button onClick={() => void edit(row)}>Edit</button>
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
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No records yet.</p>
        )}
      </section>
      <style>{`.admin-record-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.admin-record-form .wide{grid-column:1/-1}.admin-record-form>.button-row{grid-column:1/-1}.variants-editor{border-top:1px solid var(--line-soft);padding-top:14px;margin-top:4px}.variants-hint{color:var(--ink-soft);font-size:.85rem;margin-bottom:12px}.variant-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px;margin-bottom:12px;border:1px solid var(--line);border-radius:8px}.variant-row .wide{grid-column:1/-1}.variant-stripe-status{grid-column:1/-1;color:var(--ink-soft);font-size:.82rem}.checkbox-field{display:flex;flex-direction:row;align-items:center;gap:8px}@media(max-width:700px){.admin-record-form{grid-template-columns:1fr}.admin-record-form .wide{grid-column:auto}.variant-row{grid-template-columns:1fr}}`}</style>
    </>
  );
}

function ContentFields({
  kind,
  draft,
  setDraft,
}: {
  kind: ContentKind;
  draft: any;
  setDraft: (value: any) => void;
}) {
  const field = (name: string, label: string, type = "text", wide = false) => (
    <label className={`field ${wide ? "wide" : ""}`}>
      {label}
      {type === "textarea" ? (
        <textarea
          value={draft[name] || ""}
          onChange={(e) => setDraft({ ...draft, [name]: e.target.value })}
        />
      ) : (
        <input
          type={type}
          value={draft[name] ?? ""}
          onChange={(e) =>
            setDraft({
              ...draft,
              [name]:
                type === "number" ? Number(e.target.value) : e.target.value,
            })
          }
          required={
            ["title", "slug"].includes(name) ||
            (kind === "tracks" && name === "album_id")
          }
        />
      )}
    </label>
  );
  if (kind === "tracks")
    return (
      <>
        {field("title", "Title")}
        {field("album_id", "Album ID")}
        {field("track_number", "Track number", "number")}
        {field("song_key", "Song key")}
        {field("price_mp3_cents", "MP3 price (cents)", "number")}
        {field("price_chords_cents", "Chord price (cents)", "number")}
        {field("audio_asset_id", "Private MP3 media ID")}
        {field("preview_asset_id", "Public preview media ID")}
        {field("chord_pdf_asset_id", "Private chord PDF media ID")}
        {field("lyrics_pdf_asset_id", "Private lyrics PDF media ID")}
        {field("lyrics", "Lyrics", "textarea", true)}
      </>
    );
  if (kind === "albums")
    return (
      <>
        {field("title", "Title")}
        {field("slug", "Slug")}
        {field("artist", "Artist")}
        {field("year", "Year", "number")}
        {field("scripture", "Scripture")}
        {field("theme", "Theme")}
        {field("cover_asset_id", "Public cover media ID")}
        {field("preview_asset_id", "Public preview media ID")}
        <label className="field checkbox-field">
          <input
            type="checkbox"
            checked={Boolean(draft.is_featured)}
            onChange={(event) =>
              setDraft({ ...draft, is_featured: event.target.checked })
            }
          />
          Feature this album
        </label>
        {field("description", "Description", "textarea", true)}
      </>
    );
  return (
    <>
      {field("title", "Title")}
      {field("slug", "Slug")}
      {field("book", "Book")}
      {field("passage", "Passage")}
      {field("year", "Year", "number")}
      {field("poster_asset_id", "Public poster media ID")}
      {field("hero_video_asset_id", "Public video media ID")}
      {field("related_album_id", "Related album ID")}
      <label className="field checkbox-field">
        <input
          type="checkbox"
          checked={Boolean(draft.is_featured)}
          onChange={(event) =>
            setDraft({ ...draft, is_featured: event.target.checked })
          }
        />
        Feature this episode
      </label>
      {field("summary", "Summary", "textarea", true)}
    </>
  );
}

function MediaAdmin({
  profile,
  supabase,
}: {
  profile: Profile;
  supabase: Client;
}) {
  const [assets, setAssets] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("image");
  const [bucket, setBucket] = useState("public-media");
  const [altText, setAltText] = useState("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const load = () =>
    void supabase
      .from("media_assets")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setAssets((data || []) as any[]));
  useEffect(load, [supabase]);
  async function upload() {
    if (!file) return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return setMessage("Session expired.");
    const url = import.meta.env.PUBLIC_SUPABASE_URL;
    const key = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return setMessage("Storage is not configured.");
    const projectRef = new URL(url).hostname.split(".")[0];
    const objectName = `${profile.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    setMessage("Uploading…");
    const upload = new tus.Upload(file, {
      endpoint: `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`,
      headers: {
        authorization: `Bearer ${session.session.access_token}`,
        apikey: key,
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        bucketName: bucket,
        objectName,
        contentType: file.type,
        cacheControl: "3600",
      },
      onProgress: (sent, total) =>
        setProgress(Math.round((sent / total) * 100)),
      onError: (error) => setMessage(error.message),
      onSuccess: async () => {
        const { error } = await supabase.from("media_assets").insert({
          bucket,
          path: objectName,
          kind,
          title: file.name,
          mime_type: file.type,
          size_bytes: file.size,
          alt_text: altText.trim() || null,
          processing_status: "ready",
          created_by: profile.id,
        });
        setMessage(error?.message || "Upload complete.");
        setFile(null);
        setAltText("");
        setProgress(0);
        load();
      },
    });
    upload.start();
  }
  async function remove(asset: any) {
    if (
      !window.confirm(
        "Delete this media asset? Referenced records may prevent deletion.",
      )
    )
      return;
    const { error } = await supabase.functions.invoke("delete-media", {
      body: { mediaId: asset.id },
    });
    setMessage(error?.message || "Media deleted.");
    load();
  }
  return (
    <>
      <Heading
        eyebrow="Media library"
        title="Uploads"
        description="Public previews and private deliverables use separate protected buckets."
      />
      <section className="panel">
        <h2>Upload media</h2>
        <div className="admin-record-form">
          <label className="field wide">
            File
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <label className="field">
            Kind
            <select value={kind} onChange={(e) => setKind(e.target.value)}>
              {[
                "cover",
                "video",
                "audio",
                "audio_preview",
                "pdf",
                "thumbnail",
                "image",
                "bundle",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Access
            <select value={bucket} onChange={(e) => setBucket(e.target.value)}>
              <option value="public-media">Public media</option>
              <option value="private-downloads">Private downloads</option>
              <option value="source-media">Private source media</option>
            </select>
          </label>
          <label className="field wide">
            Alt text or media description
            <input
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              required={bucket === "public-media"}
            />
          </label>
          <button
            className="btn btn-solid"
            type="button"
            disabled={!file}
            onClick={() => void upload()}
          >
            Upload
          </button>
          {progress > 0 && (
            <progress max={100} value={progress}>
              {progress}%
            </progress>
          )}
        </div>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="panel">
        <h2>Assets</h2>
        {assets.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Media ID</th>
                  <th>Kind</th>
                  <th>Bucket</th>
                  <th>Size</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => (
                  <tr key={asset.id}>
                    <td data-label="Name">{asset.title}</td>
                    <td data-label="Media ID">
                      <code>{asset.id}</code>
                    </td>
                    <td data-label="Kind">{asset.kind}</td>
                    <td data-label="Bucket">{asset.bucket}</td>
                    <td data-label="Size">
                      {asset.size_bytes
                        ? `${(asset.size_bytes / 1024 / 1024).toFixed(1)} MB`
                        : "—"}
                    </td>
                    <td data-label="Actions">
                      <button
                        className="button-danger"
                        onClick={() => void remove(asset)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No media uploaded.</p>
        )}
      </section>
    </>
  );
}

function OrdersAdmin({ supabase }: { supabase: Client }) {
  type AdminOrder = Order & { order_items?: OrderItem[] };
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const load = () =>
    void supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setOrders((data || []) as unknown as AdminOrder[]));
  useEffect(load, [supabase]);
  async function refund() {
    if (!selected || !selectedItems.length)
      return setMessage("Select at least one order item.");
    if (!window.confirm("Issue this refund and revoke the selected downloads?"))
      return;
    const { data, error } = await supabase.functions.invoke("refund-order", {
      body: { orderId: selected.id, orderItemIds: selectedItems, reason },
    });
    setMessage(error?.message || `Refund ${data.order.status}.`);
    setSelected(null);
    setSelectedItems([]);
    load();
  }
  async function resend(id: string) {
    const { error } = await supabase.functions.invoke("resend-receipt", {
      body: { orderId: id },
    });
    setMessage(error?.message || "Receipt sent.");
  }
  return (
    <>
      <Heading
        eyebrow="Commerce"
        title="Orders and refunds"
        description="Review fulfillment, resend receipts, and refund selected line items."
      />
      {message && <p role="status">{message}</p>}
      <section className="panel">
        <h2>{selected ? `Refund ${selected.order_number}` : "Orders"}</h2>
        {selected ? (
          <>
            <div className="form-stack">
              {(selected.order_items || []).map((item) => (
                <label key={item.id} className="refund-check">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) =>
                      setSelectedItems(
                        e.target.checked
                          ? [...selectedItems, item.id]
                          : selectedItems.filter((id) => id !== item.id),
                      )
                    }
                  />
                  <span>{item.title_snapshot}</span>
                  <strong>
                    {formatMoney(item.price_cents_snapshot * item.quantity)}
                  </strong>
                </label>
              ))}
              <label className="field">
                Reason
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </label>
              <div className="button-row">
                <button
                  className="btn button-danger"
                  onClick={() => void refund()}
                >
                  Refund selected items
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setSelected(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        ) : orders.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Order">{order.order_number}</td>
                    <td data-label="Customer">{order.email}</td>
                    <td data-label="Status">
                      <span className="status-pill">{order.status}</span>
                    </td>
                    <td data-label="Total">{formatMoney(order.total_cents)}</td>
                    <td data-label="Date">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td data-label="Actions">
                      <div className="button-row">
                        <button onClick={() => void resend(order.id)}>
                          Resend
                        </button>
                        {["paid", "partially_refunded"].includes(
                          order.status,
                        ) && (
                          <button
                            className="button-danger"
                            onClick={() => {
                              setSelected(order);
                              setSelectedItems([]);
                            }}
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No orders yet.</p>
        )}
      </section>
      <style>{`.refund-check{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--line);border-radius:7px}`}</style>
    </>
  );
}

function PeopleAdmin({
  mode,
  profile,
  supabase,
}: {
  mode: "customers" | "staff";
  profile: Profile;
  supabase: Client;
}) {
  const [people, setPeople] = useState<Profile[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [message, setMessage] = useState("");
  const load = () =>
    void supabase
      .from("profiles")
      .select("*")
      .in(
        "role",
        mode === "customers"
          ? ["customer"]
          : ["owner", "admin", "editor", "support"],
      )
      .order("created_at", { ascending: false })
      .then(({ data }) => setPeople((data || []) as Profile[]));
  useEffect(load, [mode, supabase]);
  async function invite(event: React.FormEvent) {
    event.preventDefault();
    const { error } = await supabase.functions.invoke("invite-staff", {
      body: { email, role },
    });
    setMessage(error?.message || "Invitation sent.");
    if (!error) setEmail("");
  }
  async function manage(
    person: Profile,
    action: "disable" | "enable" | "role",
    nextRole?: UserRole,
  ) {
    const { error } = await supabase.functions.invoke("manage-user", {
      body: { userId: person.id, action, role: nextRole },
    });
    setMessage(error?.message || "Account updated.");
    load();
  }
  return (
    <>
      <Heading
        eyebrow="Access"
        title={mode === "customers" ? "Customers" : "Staff"}
        description={
          mode === "customers"
            ? "Customer accounts, purchase access, and support status."
            : "Invite staff and enforce the owner, admin, editor, and support permission model."
        }
      />
      {mode === "staff" && (
        <section className="panel">
          <h2>Invite staff</h2>
          <form className="toolbar" onSubmit={invite}>
            <input
              className="portal-input"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="portal-input"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              {(profile.role === "owner"
                ? ["admin", "editor", "support"]
                : ["editor", "support"]
              ).map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button className="btn btn-solid" type="submit">
              Send invitation
            </button>
          </form>
        </section>
      )}
      {message && <p role="status">{message}</p>}
      <section className="panel">
        <h2>{mode === "customers" ? "Customer accounts" : "Staff accounts"}</h2>
        {people.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {people.map((person) => (
                  <tr key={person.id}>
                    <td data-label="Name">{person.full_name || "—"}</td>
                    <td data-label="Email">{person.email}</td>
                    <td data-label="Role">
                      {mode === "staff" &&
                      person.role !== "owner" &&
                      person.id !== profile.id ? (
                        <select
                          value={person.role}
                          onChange={(e) =>
                            void manage(
                              person,
                              "role",
                              e.target.value as UserRole,
                            )
                          }
                          disabled={
                            profile.role !== "owner" && person.role === "admin"
                          }
                        >
                          {(profile.role === "owner"
                            ? ["admin", "editor", "support"]
                            : ["editor", "support"]
                          ).map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      ) : (
                        person.role
                      )}
                    </td>
                    <td data-label="Status">
                      <span className="status-pill">{person.status}</span>
                    </td>
                    <td data-label="Actions">
                      {person.role !== "owner" && person.id !== profile.id && (
                        <button
                          className={
                            person.status === "active" ? "button-danger" : ""
                          }
                          onClick={() =>
                            void manage(
                              person,
                              person.status === "active" ? "disable" : "enable",
                            )
                          }
                        >
                          {person.status === "active" ? "Disable" : "Enable"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No accounts found.</p>
        )}
      </section>
    </>
  );
}

function SettingsAdmin({
  profile,
  supabase,
}: {
  profile: Profile;
  supabase: Client;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [message, setMessage] = useState("");
  const load = () =>
    void supabase
      .from("site_settings")
      .select("*")
      .order("key")
      .then(({ data }) => setRows((data || []) as any[]));
  useEffect(load, [supabase]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    let parsed: Json;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
    const { error } = await supabase.from("site_settings").upsert({
      key,
      value: parsed,
      is_public: isPublic,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    });
    setMessage(error?.message || "Setting saved.");
    if (!error) {
      setKey("");
      setValue("");
      load();
    }
  }
  return (
    <>
      <Heading
        eyebrow="Configuration"
        title="Site settings"
        description="Public copy and operational defaults. Secret keys remain deployment-only."
      />
      <section className="panel">
        <h2>Add or update setting</h2>
        <form className="form-stack" onSubmit={save}>
          <label className="field">
            Key
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              pattern="[a-z0-9_.-]+"
            />
          </label>
          <label className="field">
            JSON or text value
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />{" "}
            Public setting
          </label>
          <button className="btn btn-solid" type="submit">
            Save setting
          </button>
        </form>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="panel">
        <h2>Settings</h2>
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Visibility</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td data-label="Key">{row.key}</td>
                    <td data-label="Value">
                      <code>{JSON.stringify(row.value)}</code>
                    </td>
                    <td data-label="Visibility">
                      {row.is_public ? "Public" : "Staff"}
                    </td>
                    <td data-label="Actions">
                      <button
                        onClick={() => {
                          setKey(row.key);
                          setValue(
                            typeof row.value === "string"
                              ? row.value
                              : JSON.stringify(row.value, null, 2),
                          );
                          setIsPublic(row.is_public);
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No settings yet.</p>
        )}
      </section>
    </>
  );
}

function AuditAdmin({ supabase }: { supabase: Client }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    void supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(250)
      .then(({ data }) => setRows((data || []) as any[]));
  }, [supabase]);
  return (
    <>
      <Heading
        eyebrow="Security"
        title="Audit history"
        description="Role, content, order, refund, and file changes are recorded here."
      />
      <section className="panel">
        {rows.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Time">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td data-label="Action">{row.action}</td>
                    <td data-label="Entity">{row.entity_type}</td>
                    <td data-label="Actor">{row.actor_id || "system"}</td>
                    <td data-label="Details">
                      <code>{JSON.stringify(row.metadata)}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No audit events yet.</p>
        )}
      </section>
    </>
  );
}
