import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Download, LogOut, Package, Settings, UserRound } from "lucide-react";
import { formatMoney } from "@/lib/catalog";
import type {
  DownloadEntitlement,
  Order,
  OrderItem,
  Profile,
} from "@/types/domain";
import { PortalError, PortalLoading, usePortalProfile } from "./PortalState";

type OrderWithItems = Order & { order_items?: OrderItem[] };
type EntitlementWithMedia = DownloadEntitlement & {
  media_assets?: { title: string; kind: string } | null;
  order_items?: { title_snapshot: string } | null;
};

const nav = [
  ["/account", "Overview", UserRound],
  ["/account/orders", "Orders", Package],
  ["/account/downloads", "Downloads", Download],
  ["/account/profile", "Profile & security", Settings],
] as const;

export default function AccountPortal() {
  const { profile, setProfile, loading, error, supabase } = usePortalProfile();
  const path =
    typeof window === "undefined"
      ? "/account"
      : window.location.pathname.replace(/\/$/, "") || "/account";
  if (loading) return <PortalLoading />;
  if (error || !profile || !supabase)
    return <PortalError message={error || "Your profile is unavailable."} />;
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <strong>My account</strong>
        <nav className="portal-nav">
          {nav.map(([href, label, Icon]) => (
            <a
              key={href}
              href={href}
              className={
                path === href || (href !== "/account" && path.startsWith(href))
                  ? "active"
                  : ""
              }
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </a>
          ))}
        </nav>
        <button
          className="btn btn-ghost account-signout"
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
        <AccountRoute
          path={path}
          profile={profile}
          setProfile={setProfile}
          supabase={supabase}
        />
      </div>
      <style>{`.portal-nav a,.account-signout{display:flex;align-items:center;gap:9px}.account-signout{width:100%;margin-top:14px;justify-content:center}`}</style>
    </div>
  );
}

function AccountRoute({
  path,
  profile,
  setProfile,
  supabase,
}: {
  path: string;
  profile: Profile;
  setProfile: (profile: Profile) => void;
  supabase: SupabaseClient<any>;
}) {
  if (path.startsWith("/account/downloads"))
    return <Downloads supabase={supabase} />;
  if (path.startsWith("/account/orders"))
    return <Orders supabase={supabase} selectedId={path.split("/")[3]} />;
  if (path.startsWith("/account/profile"))
    return (
      <ProfileSettings
        profile={profile}
        setProfile={setProfile}
        supabase={supabase}
      />
    );
  return <AccountOverview profile={profile} supabase={supabase} />;
}

function AccountOverview({
  profile,
  supabase,
}: {
  profile: Profile;
  supabase: SupabaseClient<any>;
}) {
  const [counts, setCounts] = useState({ orders: 0, downloads: 0 });
  useEffect(() => {
    void Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }),
      supabase
        .from("download_entitlements")
        .select("id", { count: "exact", head: true })
        .is("revoked_at", null),
    ]).then(([orders, downloads]) =>
      setCounts({ orders: orders.count || 0, downloads: downloads.count || 0 }),
    );
  }, [supabase]);
  return (
    <>
      <header className="portal-header">
        <div>
          <span className="eyebrow">Customer account</span>
          <h1>Welcome, {profile.full_name || profile.email.split("@")[0]}.</h1>
          <p>Your purchases remain available in your private library.</p>
        </div>
      </header>
      <div className="stat-grid">
        <div className="stat-card">
          <span>Orders</span>
          <strong>{counts.orders}</strong>
        </div>
        <div className="stat-card">
          <span>Available downloads</span>
          <strong>{counts.downloads}</strong>
        </div>
        <div className="stat-card">
          <span>Access</span>
          <strong>Lifetime</strong>
        </div>
      </div>
      <section className="panel">
        <h2>Quick links</h2>
        <div className="button-row">
          <a className="btn btn-solid" href="/account/downloads">
            Open downloads
          </a>
          <a className="btn btn-ghost" href="/resources">
            Browse worship
          </a>
          <a className="btn btn-ghost" href="/contact">
            Get support
          </a>
        </div>
      </section>
    </>
  );
}

function Orders({
  supabase,
  selectedId,
}: {
  supabase: SupabaseClient<any>;
  selectedId?: string;
}) {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void supabase
      .from("orders")
      .select("*, order_items(*)")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data || []) as unknown as OrderWithItems[]);
        setLoading(false);
      });
  }, [supabase]);
  const selected = useMemo(
    () => orders.find((order) => order.id === selectedId),
    [orders, selectedId],
  );
  return (
    <>
      <header className="portal-header">
        <div>
          <span className="eyebrow">Purchase history</span>
          <h1>{selected ? selected.order_number : "Orders"}</h1>
          <p>Receipts and fulfillment status for every purchase.</p>
        </div>
      </header>
      {selected ? (
        <section className="panel">
          <div className="button-row">
            <a className="btn btn-ghost" href="/account/orders">
              ← All orders
            </a>
            <span className="status-pill">
              {selected.status.replaceAll("_", " ")}
            </span>
          </div>
          <div className="order-items">
            {(selected.order_items || []).map((item) => (
              <div key={item.id}>
                <span>
                  {item.title_snapshot} × {item.quantity}
                </span>
                <strong>
                  {formatMoney(item.price_cents_snapshot * item.quantity)}
                </strong>
              </div>
            ))}
          </div>
          <div className="checkout-total">
            <span>Total</span>
            <strong>{formatMoney(selected.total_cents)}</strong>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>
            {loading
              ? "Loading orders…"
              : orders.length
                ? "Your orders"
                : "No orders yet"}
          </h2>
          {orders.length > 0 && (
            <div className="table-wrap">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.order_number}</td>
                      <td>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td>
                        <span className="status-pill">
                          {order.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{formatMoney(order.total_cents)}</td>
                      <td>
                        <a href={`/account/orders/${order.id}`}>View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !orders.length && (
            <p>
              When you claim a free resource or complete checkout, the order
              will appear here.
            </p>
          )}
        </section>
      )}
      <style>{`.order-items{margin-top:20px}.order-items>div,.checkout-total{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid var(--line-soft)}.checkout-total{font-size:1.15rem}`}</style>
    </>
  );
}

function Downloads({ supabase }: { supabase: SupabaseClient<any> }) {
  const [items, setItems] = useState<EntitlementWithMedia[]>([]);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void supabase
      .from("download_entitlements")
      .select("*, media_assets(title,kind), order_items(title_snapshot)")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .then(({ data }) =>
        setItems((data || []) as unknown as EntitlementWithMedia[]),
      );
  }, [supabase]);
  async function download(id: string) {
    setMessage("Preparing secure download…");
    const { data, error } = await supabase.functions.invoke(
      "create-download-url",
      { body: { entitlementId: id } },
    );
    if (error || !data?.url) {
      setMessage(error?.message || "Download unavailable.");
      return;
    }
    setMessage("");
    window.location.href = data.url;
  }
  return (
    <>
      <header className="portal-header">
        <div>
          <span className="eyebrow">Private library</span>
          <h1>Downloads</h1>
          <p>
            Purchased access remains here. Each click creates a short-lived
            secure link.
          </p>
        </div>
      </header>
      {message && <p role="status">{message}</p>}
      <section className="panel">
        <h2>
          {items.length ? "Available resources" : "Your library is empty"}
        </h2>
        {items.length ? (
          <div className="table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Type</th>
                  <th>Added</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {item.media_assets?.title ||
                        item.order_items?.title_snapshot ||
                        "Digital resource"}
                    </td>
                    <td>{item.media_assets?.kind || "file"}</td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-ghost"
                        onClick={() => void download(item.id)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>Browse the resource library to add a free or paid download.</p>
        )}
      </section>
    </>
  );
}

function ProfileSettings({
  profile,
  setProfile,
  supabase,
}: {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  supabase: SupabaseClient<any>;
}) {
  const [name, setName] = useState(profile.full_name || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const { data, error } = await supabase
      .from("profiles")
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq("id", profile.id)
      .select("*")
      .single();
    if (error) return setMessage(error.message);
    setProfile(data as Profile);
    setMessage("Profile saved.");
  }
  async function updatePassword() {
    if (password.length < 10) return setMessage("Use at least 10 characters.");
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error?.message || "Password updated.");
    if (!error) setPassword("");
  }
  return (
    <>
      <header className="portal-header">
        <div>
          <span className="eyebrow">Account settings</span>
          <h1>Profile and security</h1>
          <p>Update your display name or password.</p>
        </div>
      </header>
      <section className="panel">
        <h2>Profile</h2>
        <form className="form-stack" onSubmit={save}>
          <label className="field">
            Email
            <input value={profile.email} disabled />
          </label>
          <label className="field">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <button className="btn btn-solid" type="submit">
            Save profile
          </button>
        </form>
      </section>
      <section className="panel">
        <h2>Password</h2>
        <div className="form-stack">
          <label className="field">
            New password
            <input
              type="password"
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => void updatePassword()}
          >
            Update password
          </button>
        </div>
      </section>
      {message && (
        <p role="status" className="form-success">
          {message}
        </p>
      )}
    </>
  );
}
