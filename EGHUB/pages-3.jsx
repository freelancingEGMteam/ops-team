/* global React, EGH_DATA */
const { useState: useStateP3, useMemo: useMemoP3 } = React;

// ============================================================
// RESOURCES (digital products)
// ============================================================
function ResourcesPage() {
  const [filter, setFilter] = useStateP3("all");
  const [q, setQ] = useStateP3("");
  const products = EGH_DATA.products;
  const featuredAlbums = EGH_DATA.albums.slice(0, 3);
  const filtered = useMemoP3(() => {
    return products.filter((p) => {
      if (filter === "free" && p.price !== 0) return false;
      if (filter !== "all" && filter !== "free" && p.kind !== filter) return false;
      if (!q) return true;
      const hay = `${p.title} ${p.blurb} ${p.kind} ${(p.includes || []).join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [filter, q]);

  return (
    <div>
      <PageHeader
        eyebrow="Worship"
        title="Albums, chord books, and worship tools in one place."
        sub="Listen through Eternal Grace Music, browse every album, and find the lyric sheets, chord books, and bundles your church needs for the week ahead."
      >
        <div className="merged-page-actions">
          <div className="merged-section-label">Featured albums</div>
        </div>
      </PageHeader>

      <div className="container">
        <section className="merged-featured-music">
          <div className="merged-album-strip">
            {featuredAlbums.map((a) => <AlbumCard key={a.slug} album={a} />)}
          </div>
        </section>

        <section id="resources-library" className="resources-library-section">
          <div className="resource-filter-toolbar">
            <div className="resource-search">
              <Icon.search style={{ position: "absolute", left: 14, top: 14, color: "var(--ink-soft)" }} />
              <input
                className="search-input"
                placeholder="Search resources, bundles, lyrics..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ paddingLeft: 40 }} />
            </div>
            <div className="resource-filter">
              {[
                ["all", "All resources"],
                ["bundle", "Bundles"],
                ["chord-book", "Chord books"],
                ["lyrics", "Lyric PDFs"],
                ["free", "Free"],
              ].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setFilter(v)} className={`chip ${filter === v ? "active" : ""}`}>{l}</button>
              ))}
            </div>
            <div className="mono resource-count">
              {filtered.length}/{products.length} ITEMS
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyState title="Nothing here yet." sub="Try another filter or search term." />
          ) : (
            <div className="product-grid">
              {filtered.map((p) => <ProductCard key={p.slug} product={p} />)}
            </div>
          )}
        </section>

        <div className="leader-bundle-panel">
          <div className="resources-cta">
            <div>
              <div className="eyebrow">For Worship Leaders</div>
              <h2 className="serif" style={{ marginTop: 12, fontWeight: 400, fontSize: 38 }}>
                Lead any of our records, any Sunday.
              </h2>
              <p style={{ marginTop: 18, color: "var(--ink-dim)", maxWidth: 540, fontSize: 16 }}>
                Every chord book, every lyric sheet, every multi-track stem we have - bundled. One purchase, one folder, every record.
              </p>
            </div>
            <a href="#/checkout/worship-leader-bundle" className="btn btn-solid" style={{ alignSelf: "center" }}>
              Worship Leader Bundle · $39 <Icon.arrow />
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .merged-page-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .merged-section-label {
          color: var(--gold);
          font-family: var(--mono);
          font-size: 12px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .merged-featured-music {
          padding: 6px 0 52px;
        }
        .merged-album-strip {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
        }
        .resources-library-section {
          padding: 42px 0 0;
          border-top: 1px solid var(--line);
        }
        .resources-library-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .resource-filter-toolbar {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
          align-items: center;
          margin: 0 0 30px;
          padding: 14px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-elev);
        }
        .resource-search {
          position: relative;
          flex: 1 1 320px;
          max-width: 440px;
        }
        .resource-filter {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .resource-count {
          margin-left: auto;
          font-size: 11px;
          color: var(--ink-soft);
          letter-spacing: 0.16em;
        }
        .product-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        .leader-bundle-panel {
          margin-top: 56px;
          padding: 36px 32px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background:
            radial-gradient(ellipse at 90% 20%, rgba(201, 166, 97, 0.12), transparent 50%),
            var(--bg-elev);
        }
        .resources-cta { display: grid; grid-template-columns: 1fr auto; gap: 32px; align-items: center; }
        @media (max-width: 880px) {
          .merged-album-strip { grid-template-columns: 1fr; }
          .resource-search { max-width: none; flex-basis: 100%; }
          .resource-filter .chip { flex: 1 1 auto; justify-content: center; }
          .resource-count { width: 100%; margin-left: 0; text-align: right; }
          .product-grid { grid-template-columns: 1fr; }
          .resources-cta { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function ProductCard({ product }) {
  return (
    <a href={product.checkoutUrl} className="lift card item-shadow" style={{ display: "flex", flexDirection: "column", padding: 0, position: "relative" }}>
      <div style={{
        aspectRatio: "5/3",
        background:
          `radial-gradient(ellipse at 30% 30%, oklch(0.32 0.10 ${product.hue}), transparent 60%),` +
          `linear-gradient(160deg, oklch(0.16 0.06 ${product.hue}), #060d18)`,
        position: "relative",
        borderBottom: "1px solid var(--line)",
      }}>
        {product.tag && (
          <div className="mono" style={{
            position: "absolute", top: 14, left: 14,
            fontSize: 10, padding: "4px 10px",
            color: "var(--gold-bright)",
            border: "1px solid var(--gold)",
            letterSpacing: "0.16em",
          }}>{product.tag.toUpperCase()}</div>
        )}
        <div className="mono" style={{
          position: "absolute", bottom: 14, right: 14,
          fontSize: 9, color: "rgba(236,223,191,0.5)", letterSpacing: "0.2em",
        }}>EGH/{product.kind.toUpperCase()}</div>
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
          <ProductIcon kind={product.kind} />
        </div>
      </div>
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <h3 className="serif" style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.14, letterSpacing: "0" }}>{product.title}</h3>
        <p style={{ color: "var(--ink-dim)", fontSize: 13, lineHeight: 1.45 }}>{product.blurb}</p>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: 12, borderTop: "1px solid var(--line-soft)" }}>
          <div className="serif" style={{ fontSize: 23, color: "var(--gold-bright)" }}>
            {product.price === 0 ? "Free" : `$${product.price}`}
          </div>
          <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.14em", display: "inline-flex", alignItems: "center", gap: 8 }}>
            {product.price === 0 ? "DOWNLOAD" : "CHECKOUT"} <Icon.arrow />
          </div>
        </div>
      </div>
    </a>
  );
}

function ProductIcon({ kind }) {
  const sz = 64;
  const stroke = "rgba(236, 223, 191, 0.35)";
  if (kind === "bundle") return (
    <svg width={sz} height={sz} viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="0.6">
      <rect x="6" y="14" width="38" height="44" />
      <rect x="14" y="10" width="38" height="44" />
      <rect x="22" y="6" width="38" height="44" />
    </svg>
  );
  if (kind === "chord-book") return (
    <svg width={sz} height={sz} viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="0.6">
      <rect x="10" y="8" width="44" height="48" />
      <line x1="32" y1="8" x2="32" y2="56" />
      <line x1="16" y1="20" x2="28" y2="20" />
      <line x1="16" y1="28" x2="28" y2="28" />
      <line x1="16" y1="36" x2="28" y2="36" />
      <line x1="36" y1="20" x2="48" y2="20" />
      <line x1="36" y1="28" x2="48" y2="28" />
      <line x1="36" y1="36" x2="48" y2="36" />
    </svg>
  );
  if (kind === "lyrics") return (
    <svg width={sz} height={sz} viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="0.6">
      <rect x="12" y="6" width="40" height="52" />
      {[14,20,26,32,38,44,50].map((y, i) => (
        <line key={i} x1="18" y1={y} x2={i % 2 === 0 ? 46 : 38} y2={y} />
      ))}
    </svg>
  );
  return (
    <svg width={sz} height={sz} viewBox="0 0 64 64" fill="none" stroke={stroke} strokeWidth="0.6">
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="3" fill={stroke} />
    </svg>
  );
}

// ============================================================
// ADMIN - backend-ready dashboard shell
// ============================================================
function AdminLayout({ children, active }) {
  const tabs = [
    ["#/admin", "Overview"],
    ["#/admin/uploads", "Uploads"],
    ["#/admin/albums", "Albums"],
    ["#/admin/tracks", "Tracks"],
    ["#/admin/videos", "Videos"],
    ["#/admin/products", "Products"],
    ["#/admin/orders", "Orders"],
    ["#/admin/customers", "Customers"],
    ["#/admin/users", "Users"],
    ["#/admin/settings", "Settings"],
    ["#/admin/audit", "Audit"],
  ];
  return (
    <div className="container admin-shell">
      <div className="admin-kicker-row">
        <div className="mono admin-status-pill">
          BACKEND BLUEPRINT
        </div>
        <div className="eyebrow">Eternal Grace Hub Admin</div>
      </div>
      <h1 className="serif admin-title">Content, worship, and orders dashboard.</h1>
      <p className="admin-sub">
        This is the structure for the real admin area: upload media, publish albums and episodes, manage products, review orders, and control users.
      </p>
      <div className="admin-tabs">
        {tabs.map(([href, label]) => (
          <a key={href} href={href}
            className={active === href ? "active" : ""}>
            {label}
          </a>
        ))}
      </div>
      <div className="admin-body">{children}</div>
      <AdminStyles />
    </div>
  );
}

function AdminOverview() {
  const stats = [
    ["Albums", EGH_DATA.albums.length],
    ["Videos", EGH_DATA.videos.length],
    ["Products", EGH_DATA.products.length],
    ["Orders", "API"],
    ["Uploads", "Queue"],
    ["Users", "Auth"],
  ];
  return (
    <AdminLayout active="#/admin">
      <div className="admin-stats stats-grid">
        {stats.map(([k, v]) => (
          <div key={k} className="admin-stat-card">
            <div className="eyebrow">{k}</div>
            <div className="serif">{v}</div>
          </div>
        ))}
      </div>
      <div className="admin-panel">
        <h3 className="serif">Backend build checklist</h3>
        <ul className="admin-checklist">
          {[
            "Create Postgres tables and seed current data.js content",
            "Protect /admin with Supabase Auth roles: owner, admin, editor, support",
            "Add signed uploads for video, audio, previews, PDFs, and artwork",
            "Connect product variations and individual tracks to Stripe prices",
            "Generate download grants after paid Stripe webhooks",
            "Build audit log for every publish, price, role, and file change",
          ].map((s, i) => (
            <li key={i}>
              <input type="checkbox" /> {s}
            </li>
          ))}
        </ul>
      </div>
    </AdminLayout>
  );
}

function AdminTable({ active, title, rows, columns }) {
  return (
    <AdminLayout active={active}>
      <div className="admin-table-heading">
        <h3 className="serif">{title}</h3>
        <button className="btn btn-sm">+ New (placeholder)</button>
      </div>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c} className="mono">
                  {c.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

function AdminAlbums() {
  return <AdminTable
    active="#/admin/albums"
    title="Albums"
    columns={["Title", "Slug", "Year", "Tracks", "Status"]}
    rows={EGH_DATA.albums.map((a) => [a.title, a.slug, a.year, a.tracks.length, "Published"])}
  />;
}
function AdminTracks() {
  const rows = EGH_DATA.albums.flatMap((a) =>
    a.tracks.map((t) => [t.title, a.title, String(t.n).padStart(2, "0"), t.time, "MP3 + Chords"])
  );
  return <AdminTable
    active="#/admin/tracks"
    title="Tracks"
    columns={["Title", "Album", "No.", "Runtime", "Products"]}
    rows={rows}
  />;
}
function AdminVideos() {
  return <AdminTable
    active="#/admin/videos"
    title="Videos"
    columns={["Title", "Slug", "Passage", "Runtime", "Status"]}
    rows={EGH_DATA.videos.map((v) => [v.title, v.slug, v.passage, v.runtime, "Published"])}
  />;
}
function AdminProducts() {
  return <AdminTable
    active="#/admin/products"
    title="Products"
    columns={["Title", "Slug", "Kind", "Price", "Checkout"]}
    rows={EGH_DATA.products.map((p) => [p.title, p.slug, p.kind, p.price === 0 ? "Free" : `$${p.price}`, p.checkoutUrl])}
  />;
}
function AdminUploads() {
  return <AdminLayout active="#/admin/uploads">
    <div className="admin-action-grid">
      {[
        ["Video upload", "Episode videos and album preview videos. Store full files privately and stream signed URLs."],
        ["Audio upload", "Full MP3 masters plus generated 15-second previews for track cards."],
        ["PDF upload", "Chord books, lyrics PDFs, lead sheets, and per-track chord sheets."],
        ["Artwork upload", "Album covers, episode posters, thumbnails, and resource artwork."],
      ].map(([title, body]) => (
        <div className="admin-action-card" key={title}>
          <div className="eyebrow">{title}</div>
          <p>{body}</p>
          <button className="btn btn-sm">Upload placeholder</button>
        </div>
      ))}
    </div>
  </AdminLayout>;
}
function AdminOrders() {
  return <AdminTable
    active="#/admin/orders"
    title="Orders"
    columns={["Order", "Customer", "Items", "Total", "Status"]}
    rows={[
      ["EGH-1001", "customer@email.com", "3 digital files", "$26", "Paid"],
      ["EGH-1002", "guest@email.com", "1 track + donation", "$7", "Paid"],
      ["Webhook sync", "Stripe", "Download grants", "Queued", "Pending"],
    ]}
  />;
}
function AdminCustomers() {
  return <AdminTable
    active="#/admin/customers"
    title="Customers"
    columns={["Email", "Orders", "Downloads", "Last activity", "Status"]}
    rows={[
      ["customer@email.com", "2", "6 grants", "Today", "Active"],
      ["guest@email.com", "1", "2 grants", "This week", "Guest"],
      ["newsletter@example.com", "0", "0 grants", "Subscribed", "Lead"],
    ]}
  />;
}
function AdminUsers() {
  return <AdminTable
    active="#/admin/users"
    title="Admin users"
    columns={["Name", "Email", "Role", "Access", "Status"]}
    rows={[
      ["Owner", "owner@eternalgracehub.com", "owner", "Everything", "Active"],
      ["Content Editor", "editor@eternalgracehub.com", "editor", "Content + uploads", "Invite pending"],
      ["Support", "support@eternalgracehub.com", "support", "Orders + customers", "Draft"],
    ]}
  />;
}
function AdminSettings() {
  return <AdminLayout active="#/admin/settings">
    <div className="admin-action-grid">
      {[
        ["Payments", "Stripe keys, webhook secret, tax behavior, and checkout return URLs."],
        ["Downloads", "Expiration windows, max downloads, signed URL settings, and resend rules."],
        ["Donations", "Default donation text, mercy verse, and reporting category."],
        ["Search", "Search index weights for albums, tracks, episodes, products, and scripture."],
        ["Email", "Receipt, download delivery, contact form, and admin notification templates."],
        ["Publishing", "Draft, review, scheduled, published, and archived status rules."],
      ].map(([title, body]) => (
        <div className="admin-action-card" key={title}>
          <div className="eyebrow">{title}</div>
          <p>{body}</p>
        </div>
      ))}
    </div>
  </AdminLayout>;
}
function AdminAudit() {
  return <AdminTable
    active="#/admin/audit"
    title="Audit log"
    columns={["When", "User", "Action", "Record", "Status"]}
    rows={[
      ["Today", "owner@eternalgracehub.com", "Updated product price", "Fire From Heaven MP3", "Logged"],
      ["Today", "editor@eternalgracehub.com", "Uploaded preview audio", "Track 04", "Logged"],
      ["Yesterday", "system", "Created download grant", "Order EGH-1001", "Logged"],
    ]}
  />;
}

function AdminStyles() {
  return <style>{`
    .admin-shell { padding: 32px 0 56px; }
    .admin-kicker-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; flex-wrap: wrap; }
    .admin-status-pill { font-size: 10px; padding: 4px 10px; border: 1px solid var(--gold); color: var(--gold-bright); letter-spacing: .18em; }
    .admin-title { font-weight: 600; font-size: clamp(28px, 3vw, 42px); max-width: 760px; line-height: 1.08; }
    .admin-sub { margin-top: 12px; color: var(--ink-dim); max-width: 760px; font-size: 15px; line-height: 1.55; }
    .admin-tabs { display: flex; gap: 6px; margin-top: 28px; border-bottom: 1px solid var(--line); overflow-x: auto; padding-bottom: 1px; }
    .admin-tabs a { white-space: nowrap; padding: 11px 14px; font-size: 12px; letter-spacing: .07em; color: var(--ink-soft); border-bottom: 2px solid transparent; }
    .admin-tabs a.active { color: var(--gold-bright); border-bottom-color: var(--gold); }
    .admin-body { margin-top: 32px; }
    .admin-stats { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 14px; }
    .admin-stat-card { border: 1px solid var(--line); padding: 18px; background: rgba(255,255,255,.45); }
    .admin-stat-card .serif { font-size: 34px; margin-top: 8px; color: var(--ink); }
    .admin-panel { margin-top: 28px; border: 1px solid var(--line); padding: 22px; background: rgba(255,255,255,.5); }
    .admin-panel h3, .admin-table-heading h3 { font-weight: 600; margin: 0; }
    .admin-checklist { list-style: none; padding: 0; margin: 18px 0 0; display: grid; gap: 8px; }
    .admin-checklist li { display: flex; gap: 12px; padding: 11px 14px; border: 1px solid var(--line-soft); font-size: 14px; align-items: center; }
    .admin-table-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 16px; }
    .admin-table-wrap { border: 1px solid var(--line); overflow: auto; background: rgba(255,255,255,.5); }
    .admin-table-wrap table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 720px; }
    .admin-table-wrap th { text-align: left; padding: 12px 14px; font-size: 10px; letter-spacing: .16em; color: var(--ink-soft); border-bottom: 1px solid var(--line); background: var(--bg-elev); }
    .admin-table-wrap td { padding: 12px 14px; color: var(--ink-dim); border-bottom: 1px solid var(--line-soft); }
    .admin-table-wrap td:first-child { color: var(--ink); font-weight: 700; }
    .admin-action-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; }
    .admin-action-card { border: 1px solid var(--line); background: rgba(255,255,255,.52); padding: 20px; min-height: 170px; display: flex; flex-direction: column; gap: 14px; }
    .admin-action-card p { color: var(--ink-dim); line-height: 1.5; margin: 0; }
    .admin-action-card .btn { margin-top: auto; align-self: flex-start; }
    @media (max-width: 980px) {
      .admin-stats { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .admin-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 620px) {
      .admin-stats, .admin-action-grid { grid-template-columns: 1fr; }
      .admin-table-heading { align-items: flex-start; flex-direction: column; }
    }
  `}</style>;
}

// ============================================================
// ABOUT / CONTACT / LEGAL
// ============================================================
function AboutPage() {
  return (
    <div>
      <PageHeader
        eyebrow="About"
        title="Two ministries, one Hub."
        sub="BibleinVideo tells the stories, EternalGrace Music sings them."
        variant="compact"
      />
      <div className="container about-section">
        <div className="about-grid">
          <div className="about-card lift">
            <div className="eyebrow">Music</div>
            <h2 className="serif">Why album-first.</h2>
            <p>
              Records are how the church has sung for two thousand years - together, in order, beginning to end. Singles are good business; albums are better worship. We chose the harder path on purpose.
            </p>
          </div>
          <div className="about-card lift">
            <div className="eyebrow">Story</div>
            <h2 className="serif">Why "BibleInVideo."</h2>
            <p>
              Because the Bible is a body of stories, and stories want to be seen. We don't dramatize scripture; we frame it. Every word in our films comes from the text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactPage() {
  const [sent, setSent] = useStateP3(false);
  return (
    <div>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        sub="Press, partnerships, prayer requests, bug reports - they all come to the same inbox. We read every one."
        variant="contact"
      />
      <div className="container-narrow" style={{ paddingBottom: 48 }}>
        <form className="contact-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
          <div className="contact-field">
            <label>Your name</label>
            <input className="input" placeholder="Jane Doe" required />
          </div>
          <div className="contact-field">
            <label>Your email</label>
            <input className="input" type="email" placeholder="jane@email.com" required />
          </div>
          <div className="contact-field contact-field-full">
            <label>Reason</label>
            <select className="input">
              <option>General</option>
              <option>Press</option>
              <option>Partnership</option>
              <option>Prayer request</option>
              <option>Bug report</option>
            </select>
          </div>
          <div className="contact-field contact-field-full">
            <label>Message</label>
            <textarea className="input" rows="7" placeholder="How can we help?" required />
          </div>
          <button type="submit" className="btn btn-solid contact-submit">
            {sent ? "Sent. Thank you." : "Submit"}
          </button>
        </form>
      </div>
    </div>
  );
}

function LegalPage({ kind }) {
  const map = {
    privacy: { eyebrow: "Legal - Privacy", title: "Privacy Policy", body: privacyText() },
    terms: { eyebrow: "Legal - Terms", title: "Terms of Use", body: termsText() },
    "refund-policy": { eyebrow: "Legal - Refunds", title: "Refund Policy", body: refundsText() },
  };
  const page = map[kind];
  return (
    <div>
      <PageHeader eyebrow={page.eyebrow} title={page.title} sub="Last updated: October 2025" />
      <div className="container-narrow" style={{ paddingBottom: 64 }}>
        <article style={{ fontSize: 16, lineHeight: 1.75, color: "var(--ink)" }}>
          {page.body.map((p, i) =>
            p.h ? <h3 key={i} className="serif" style={{ marginTop: 36, fontWeight: 500 }}>{p.h}</h3>
                : <p key={i} style={{ marginTop: 16 }}>{p.t}</p>
          )}
        </article>
      </div>
    </div>
  );
}
function privacyText() {
  return [
    { t: "Eternal Grace Hub is a media ministry. This policy describes the small amount of personal data we collect and how we handle it. We do not sell or share your data with third parties for advertising - ever." },
    { h: "What we collect" },
    { t: "If you subscribe to our newsletter, we store your email address and the date you subscribed. If you purchase a digital product, our payment processor (Stripe) collects payment details on our behalf; we never see your card number." },
    { h: "What we do with it" },
    { t: "We use your email to send the newsletter you signed up for. We use purchase records to deliver your download links and to satisfy tax/accounting requirements. That's it." },
    { h: "Your rights" },
    { t: "You can unsubscribe from the newsletter at the bottom of any issue, or write to hello@eternalgracehub.example and we will delete your records on request." },
  ];
}
function termsText() {
  return [
    { t: "By using Eternal Grace Hub you agree to these terms. They are intentionally short." },
    { h: "Use of the site" },
    { t: "The films and recordings on this site are (c) Eternal Grace Hub. You may watch and listen freely. You may not redistribute the audio or video files, sell them, or modify them, without written permission." },
    { h: "Worship use" },
    { t: "If your church wants to project lyrics or play recordings during a service, you are welcome to. Just credit Eternal Grace Music in your service notes when appropriate." },
    { h: "Disclaimer" },
    { t: "This site is provided as-is. We pray it serves you, but we make no warranty that it will be available, accurate, or fit for any particular purpose." },
  ];
}
function refundsText() {
  return [
    { t: "We sell digital products. The usual no-returns rule for digital goods applies - but we extend grace." },
    { h: "If something's broken" },
    { t: "If a file is corrupted, missing, or wrong, write to hello@eternalgracehub.example and we'll replace it. No questions." },
    { h: "If you changed your mind" },
    { t: "If you bought a download and haven't downloaded it yet (we can see), we'll refund it on request within 30 days of purchase. After it's been downloaded, we generally don't refund - but if you bought the wrong thing by mistake, write and we'll talk." },
    { h: "Free things" },
    { t: "If we ever charged you for something we list as free, that's our fault. Tell us, and we'll refund and apologize." },
  ];
}

Object.assign(window, {
  ResourcesPage,
  AdminOverview,
  AdminUploads,
  AdminAlbums,
  AdminTracks,
  AdminVideos,
  AdminProducts,
  AdminOrders,
  AdminCustomers,
  AdminUsers,
  AdminSettings,
  AdminAudit,
  AboutPage,
  ContactPage,
  LegalPage,
});
