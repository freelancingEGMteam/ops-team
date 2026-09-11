/* global React, ReactDOM, EGH_DATA */
const { useState: useStateA, useEffect: useEffectA } = React;

// Tweak defaults — persisted by host
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "albumLayout": "vinyl",
  "tone": "cathedral"
}/*EDITMODE-END*/;

function useRoute() {
  const [route, setRoute] = useStateA(window.location.hash.replace(/^#/, "") || "/");
  useEffectA(() => {
    const onHash = () => {
      setRoute(window.location.hash.replace(/^#/, "") || "/");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

function App() {
  const route = useRoute();
  const [tweaks, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  const [cartItems, setCartItems] = useStateA(() => {
    try { return JSON.parse(localStorage.getItem("egh-cart") || "[]"); } catch (e) { return []; }
  });
  const [lastOrder, setLastOrder] = useStateA(null);
  const saveCart = (items) => {
    setCartItems(items);
    try { localStorage.setItem("egh-cart", JSON.stringify(items)); } catch (e) {}
  };
  const addToCart = (items) => {
    const incoming = Array.isArray(items) ? items : [items];
    const clean = incoming.filter(Boolean).map((item) => ({
      ...item,
      id: item.id || `${item.type || "item"}-${item.slug || item.title}-${Date.now()}`,
      qty: item.qty || 1,
    }));
    if (!clean.length) return;
    const merged = new Map(cartItems.map((item) => [item.id, item]));
    clean.forEach((item) => merged.set(item.id, item));
    saveCart(Array.from(merged.values()));
  };
  const removeFromCart = (id) => saveCart(cartItems.filter((item) => item.id !== id));
  const clearCart = () => saveCart([]);
  useEffectA(() => {
    window.EGH_ADD_TO_CART = addToCart;
    window.EGH_CART_COUNT = cartItems.length;
  }, [cartItems]);

  // Apply tone (only affects dark mode — light mode is driven by [data-theme] in CSS)
  useEffectA(() => {
    const r = document.documentElement.style;
    const toneProps = ["--bg", "--bg-deep", "--bg-elev", "--ink", "--gold", "--gold-bright"];
    if (document.documentElement.getAttribute("data-theme") === "light") {
      toneProps.forEach((p) => r.removeProperty(p));
      return;
    }
    const tones = {
      cathedral: { bg: "#0a1422", bgDeep: "#060d18", bgElev: "#122033", ink: "#ecdfbf", gold: "#c9a661", goldBright: "#e6c987" },
      minimal:   { bg: "#0b0c0e", bgDeep: "#050608", bgElev: "#161719", ink: "#e8e6df", gold: "#b58a3a", goldBright: "#d6a854" },
      candlelit: { bg: "#1a1410", bgDeep: "#0e0a06", bgElev: "#241c14", ink: "#f0dfb6", gold: "#d4a14a", goldBright: "#efc474" },
    };
    const tone = tones[tweaks.tone] || tones.cathedral;
    r.setProperty("--bg", tone.bg);
    r.setProperty("--bg-deep", tone.bgDeep);
    r.setProperty("--bg-elev", tone.bgElev);
    r.setProperty("--ink", tone.ink);
    r.setProperty("--gold", tone.gold);
    r.setProperty("--gold-bright", tone.goldBright);
  }, [tweaks.tone]);

  // Re-run tone effect whenever the html data-theme attribute flips.
  useEffectA(() => {
    const obs = new MutationObserver(() => {
      const r = document.documentElement.style;
      if (document.documentElement.getAttribute("data-theme") === "light") {
        ["--bg","--bg-deep","--bg-elev","--ink","--gold","--gold-bright"].forEach((p) => r.removeProperty(p));
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  // Global play state (sticky player)
  const [playState, setPlayState] = useStateA(null);
  const play = (album, track, options = {}) => {
    setPlayState((cur) => {
      if (cur && cur.album === album.slug && cur.trackN === track.n && !!cur.preview === !!options.preview) {
        return { ...cur, playing: !cur.playing };
      }
      return {
        album: album.slug,
        trackN: track.n,
        title: track.title,
        duration: options.preview ? "0:15" : track.time,
        albumTitle: options.preview ? `${album.title} - 15 sec preview` : album.title,
        hue: album.coverHue,
        playing: true,
        preview: !!options.preview
      };
    });
  };
  useEffectA(() => {
    if (!playState?.playing || !playState.preview) return;
    const id = setTimeout(() => {
      setPlayState((cur) => cur && cur.preview ? { ...cur, playing: false } : cur);
    }, 15000);
    return () => clearTimeout(id);
  }, [playState?.album, playState?.trackN, playState?.playing, playState?.preview]);
  const togglePlay = () => setPlayState((cur) => cur ? { ...cur, playing: !cur.playing } : cur);
  const closePlayer = () => setPlayState(null);

  // Render
  let page;
  const parts = route.split("/").filter(Boolean); // e.g. ["bibleinvideo", "lazarus..."]
  if (parts.length === 0) page = <window.HomePage play={play} />;
  else if (parts[0] === "bibleinvideo" && !parts[1]) page = <window.BibleInVideoPage />;
  else if (parts[0] === "bibleinvideo" && parts[1]) page = <window.VideoDetailPage slug={parts[1]} />;
  else if (parts[0] === "music" && !parts[1]) page = <window.ResourcesPage />;
  else if (parts[0] === "music" && parts[1] === "albums" && !parts[2]) page = <window.ResourcesPage />;
  else if (parts[0] === "music" && parts[1] === "albums" && parts[2]) {
    page = <window.AlbumDetailPage slug={parts[2]} layout={tweaks.albumLayout} play={play} playState={playState} />;
  }
  else if (parts[0] === "resources") page = <window.ResourcesPage />;
  else if (parts[0] === "search") page = <SearchPage />;
  else if (parts[0] === "admin" && !parts[1]) page = <window.AdminOverview />;
  else if (parts[0] === "admin" && parts[1] === "uploads") page = <window.AdminUploads />;
  else if (parts[0] === "admin" && parts[1] === "albums") page = <window.AdminAlbums />;
  else if (parts[0] === "admin" && parts[1] === "tracks") page = <window.AdminTracks />;
  else if (parts[0] === "admin" && parts[1] === "videos") page = <window.AdminVideos />;
  else if (parts[0] === "admin" && parts[1] === "products") page = <window.AdminProducts />;
  else if (parts[0] === "admin" && parts[1] === "orders") page = <window.AdminOrders />;
  else if (parts[0] === "admin" && parts[1] === "customers") page = <window.AdminCustomers />;
  else if (parts[0] === "admin" && parts[1] === "users") page = <window.AdminUsers />;
  else if (parts[0] === "admin" && parts[1] === "settings") page = <window.AdminSettings />;
  else if (parts[0] === "admin" && parts[1] === "audit") page = <window.AdminAudit />;
  else if (parts[0] === "about") page = <window.AboutPage />;
  else if (parts[0] === "contact") page = <window.ContactPage />;
  else if (parts[0] === "privacy") page = <window.LegalPage kind="privacy" />;
  else if (parts[0] === "terms") page = <window.LegalPage kind="terms" />;
  else if (parts[0] === "refund-policy") page = <window.LegalPage kind="refund-policy" />;
  else if (parts[0] === "cart") page = <CartPage items={cartItems} onRemove={removeFromCart} onClear={clearCart} />;
  else if (parts[0] === "checkout") page = <CheckoutPage slug={parts[1]} cartItems={cartItems} addToCart={addToCart} clearCart={clearCart} setLastOrder={setLastOrder} />;
  else if (parts[0] === "order-confirmation") page = <OrderConfirmation order={lastOrder} />;
  else page = <window.NotFound />;

  const TP = window.TweaksPanel;
  const TweakRadio = window.TweakRadio;
  const TweakSection = window.TweakSection;

  return (
    <>
      <window.Nav route={"/" + parts.join("/")} cartCount={cartItems.length} />
      {page}
      <window.Footer />
      {playState && <window.StickyPlayer state={{ ...playState, album: playState.albumTitle }} onToggle={togglePlay} onClose={closePlayer} />}
      <TP title="Tweaks" subtitle="Eternal Grace Hub">
        <TweakSection title="Album page layout">
          <TweakRadio
            value={tweaks.albumLayout}
            onChange={(v) => setTweak("albumLayout", v)}
            options={[
              { value: "vinyl", label: "Vinyl" },
              { value: "editorial", label: "Editorial" },
              { value: "leader", label: "Leader" },
            ]}
          />
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Open any album to see the variant. Vinyl: sticky cover + tracklist. Editorial: full-bleed hero. Leader: tab-based worship leader view.
          </p>
        </TweakSection>
        <TweakSection title="Visual tone">
          <TweakRadio
            value={tweaks.tone}
            onChange={(v) => setTweak("tone", v)}
            options={[
              { value: "cathedral", label: "Cathedral" },
              { value: "minimal", label: "Minimal" },
              { value: "candlelit", label: "Candlelit" },
            ]}
          />
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Cathedral: deep navy + gold. Minimal: near-black + bronze. Candlelit: warm brown + amber.
          </p>
        </TweakSection>
      </TP>
    </>
  );
}

function SearchPage() {
  const [query, setQuery] = useStateA("");
  const [kind, setKind] = useStateA("all");
  const normalize = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const buildSearchIndex = () => {
    const albums = EGH_DATA.albums.map((album) => ({
      id: `album-${album.slug}`,
      kind: "albums",
      type: "Album",
      title: album.title,
      eyebrow: "Eternal Grace Music",
      description: album.description,
      meta: `${album.tracks.length} tracks - ${album.year} - ${album.scripture}`,
      href: `#/music/albums/${album.slug}`,
      text: [album.title, album.artist, album.scripture, album.theme, album.description, album.tracks.map((track) => track.title).join(" ")].join(" "),
    }));
    const tracks = EGH_DATA.albums.flatMap((album) => album.tracks.map((track) => ({
      id: `track-${album.slug}-${track.n}`,
      kind: "tracks",
      type: "Track",
      title: track.title,
      eyebrow: album.title,
      description: track.lyric,
      meta: `${String(track.n).padStart(2, "0")} - ${track.time} - Key of ${track.key}`,
      href: `#/music/albums/${album.slug}`,
      text: [track.title, track.key, track.lyric, album.title, album.scripture, album.theme].join(" "),
    })));
    const videos = EGH_DATA.videos.map((video) => ({
      id: `video-${video.slug}`,
      kind: "episodes",
      type: "Episode",
      title: video.title,
      eyebrow: "BibleInVideo",
      description: video.summary,
      meta: `${video.book} - ${video.passage} - ${video.runtime}`,
      href: `#/bibleinvideo/${video.slug}`,
      text: [video.title, video.book, video.passage, video.testament, video.summary, (video.themes || []).join(" ")].join(" "),
    }));
    const resources = EGH_DATA.products.map((product) => ({
      id: `resource-${product.slug}`,
      kind: "resources",
      type: "Resource",
      title: product.title,
      eyebrow: product.category,
      description: product.blurb,
      meta: product.price === 0 ? "Free download" : `$${product.price}`,
      href: "#/resources",
      text: [product.title, product.category, product.blurb, (product.includes || []).join(" ")].join(" "),
    }));
    return [...albums, ...tracks, ...videos, ...resources];
  };
  const index = buildSearchIndex();
  const q = normalize(query);
  const filtered = index.filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (!q) return true;
    return normalize(item.text).includes(q);
  });
  const visible = q ? filtered : filtered.slice(0, 18);
  const counts = {
    all: index.length,
    albums: index.filter((item) => item.kind === "albums").length,
    tracks: index.filter((item) => item.kind === "tracks").length,
    episodes: index.filter((item) => item.kind === "episodes").length,
    resources: index.filter((item) => item.kind === "resources").length,
  };
  const filters = [
    ["all", "All"],
    ["albums", "Albums"],
    ["tracks", "Tracks"],
    ["episodes", "Episodes"],
    ["resources", "Resources"],
  ];

  return (
    <main className="site-search-page">
      <div className="container">
        <div className="eyebrow">Search EternalGrace Hub</div>
        <h1 className="serif">Find episodes, albums, songs, and resources.</h1>
        <div className="site-search-box">
          <window.Icon.search />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Bible stories, albums, tracks, chord sheets..."
            aria-label="Search the site" />
        </div>
        <div className="site-search-filters" aria-label="Search filters">
          {filters.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={kind === value ? "active" : ""}
              onClick={() => setKind(value)}>
              {label} <span>{counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="site-search-meta">
          {q ? `${visible.length} result${visible.length === 1 ? "" : "s"} for "${query}"` : "Start typing, or browse the full catalog below."}
        </div>
        {visible.length ? (
          <div className="site-search-results">
            {visible.map((item) => (
              <a key={item.id} href={item.href} className="site-search-result lift">
                <div>
                  <span className="mono">{item.type}</span>
                  <strong>{item.title}</strong>
                  <small>{item.eyebrow}</small>
                </div>
                <p>{item.description}</p>
                <footer>
                  <span>{item.meta}</span>
                  <window.Icon.arrow />
                </footer>
              </a>
            ))}
          </div>
        ) : (
          <window.EmptyState title="No results found." sub="Try a Bible book, album title, song name, theme, or resource type." />
        )}
      </div>
      <style>{`
        .site-search-page {
          min-height: 72vh;
          padding: 58px 0 76px;
          background:
            radial-gradient(circle at 12% 12%, color-mix(in oklab, var(--gold) 10%, transparent), transparent 30%),
            var(--bg-soft);
        }
        .site-search-page h1 {
          max-width: 880px;
          margin: 16px 0 0;
          font-size: clamp(38px, 6vw, 72px);
          line-height: 1.02;
          font-weight: 400;
        }
        .site-search-box {
          display: grid;
          grid-template-columns: 22px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          margin-top: 30px;
          max-width: 980px;
          min-height: 64px;
          padding: 0 20px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-elev);
          box-shadow: 0 18px 48px rgba(6, 13, 24, 0.08);
        }
        .site-search-box svg {
          color: var(--gold);
        }
        .site-search-box input {
          width: 100%;
          height: 62px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--ink);
          font-size: 18px;
        }
        .site-search-filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 18px;
        }
        .site-search-filters button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 38px;
          padding: 0 15px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--bg-elev);
          color: var(--ink);
          font-size: 13px;
          font-weight: 700;
        }
        .site-search-filters button.active {
          border-color: var(--ink);
          background: var(--ink);
          color: var(--bg);
        }
        .site-search-filters span {
          opacity: 0.62;
          font-size: 12px;
        }
        .site-search-meta {
          margin-top: 22px;
          color: var(--ink-dim);
          font-size: 14px;
        }
        .site-search-results {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-top: 22px;
        }
        .site-search-result {
          display: grid;
          gap: 16px;
          min-height: 230px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-elev);
          color: var(--ink);
        }
        .site-search-result .mono {
          display: block;
          margin-bottom: 13px;
          color: var(--gold);
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .site-search-result strong {
          display: block;
          font-size: 22px;
          line-height: 1.12;
        }
        .site-search-result small {
          display: block;
          margin-top: 8px;
          color: var(--ink-soft);
          font-size: 12px;
        }
        .site-search-result p {
          margin: 0;
          color: var(--ink-dim);
          font-size: 13px;
          line-height: 1.55;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .site-search-result footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          align-self: end;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          color: var(--ink-soft);
          font-size: 12px;
        }
        @media (max-width: 920px) {
          .site-search-results {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 620px) {
          .site-search-page {
            padding-top: 34px;
          }
          .site-search-box {
            min-height: 56px;
            padding: 0 14px;
          }
          .site-search-box input {
            height: 54px;
            font-size: 15px;
          }
          .site-search-results {
            grid-template-columns: 1fr;
          }
          .site-search-result {
            min-height: 0;
          }
        }
      `}</style>
    </main>
  );
}

function formatMoney(value) {
  return value === 0 ? "Free" : `$${Number(value || 0).toFixed(0)}`;
}

function orderTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 1), 0);
}

function productToCartItem(product) {
  if (!product) return null;
  return {
    id: `product-${product.slug}`,
    type: "Product",
    title: product.title,
    subtitle: product.blurb,
    price: product.price,
    qty: 1,
    slug: product.slug,
  };
}

function CartPage({ items, onRemove, onClear }) {
  const total = orderTotal(items);
  return (
    <main className="ecom-page">
      <div className="container">
        <div className="ecom-page-head">
          <div>
            <div className="eyebrow">Cart</div>
            <h1 className="serif">Your digital downloads.</h1>
          </div>
          <a href="#/resources" className="btn btn-ghost">Continue shopping</a>
        </div>
        {items.length ? (
          <div className="ecom-grid">
            <section className="ecom-panel">
              {items.map((item) => (
                <div key={item.id} className="cart-line">
                  <div>
                    <span className="mono">{item.type || "Item"}</span>
                    <strong>{item.title}</strong>
                    {item.subtitle && <p>{item.subtitle}</p>}
                  </div>
                  <div className="cart-line-side">
                    <b>{formatMoney(item.price)}</b>
                    <button type="button" onClick={() => onRemove(item.id)}>Remove</button>
                  </div>
                </div>
              ))}
            </section>
            <aside className="ecom-summary">
              <h2>Order summary</h2>
              <div className="summary-row"><span>Items</span><strong>{items.length}</strong></div>
              <div className="summary-row"><span>Delivery</span><strong>Digital</strong></div>
              <div className="summary-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
              <a href="#/checkout" className="btn btn-solid">Proceed to checkout</a>
              <button type="button" className="ecom-text-button" onClick={onClear}>Clear cart</button>
            </aside>
          </div>
        ) : (
          <div className="ecom-empty">
            <h2>Your cart is empty.</h2>
            <p>Browse worship downloads, albums, chord books, and lyrics to begin.</p>
            <a href="#/resources" className="btn btn-solid">Browse Worship</a>
          </div>
        )}
      </div>
      <EcommerceStyles />
    </main>
  );
}

function CheckoutPage({ slug, cartItems, addToCart, clearCart, setLastOrder }) {
  const product = EGH_DATA.products.find((p) => p.slug === slug);
  const directItem = productToCartItem(product);
  const checkoutItems = directItem ? [directItem] : cartItems;
  const total = orderTotal(checkoutItems);
  const [email, setEmail] = useStateA("");
  const [name, setName] = useStateA("");
  const [status, setStatus] = useStateA("");
  const placeOrder = () => {
    if (!checkoutItems.length) {
      setStatus("Add an item before checkout.");
      return;
    }
    if (!email.trim()) {
      setStatus("Enter an email for digital delivery.");
      return;
    }
    const order = {
      id: `EGH-${Math.floor(100000 + Math.random() * 900000)}`,
      email,
      name,
      items: checkoutItems,
      total,
    };
    setLastOrder(order);
    if (!directItem) clearCart();
    window.location.hash = "#/order-confirmation";
  };
  return (
    <main className="ecom-page">
      <div className="container">
        <div className="ecom-page-head">
          <div>
            <div className="eyebrow">Checkout</div>
            <h1 className="serif">Complete your digital order.</h1>
          </div>
          <a href="#/cart" className="btn btn-ghost">View cart</a>
        </div>
        <div className="ecom-grid">
          <section className="ecom-panel checkout-form">
            {directItem && (
              <div className="checkout-selected-product">
                <span className="mono">Selected item</span>
                <strong>{directItem.title}</strong>
                <p>{directItem.subtitle}</p>
                <button type="button" onClick={() => { addToCart(directItem); setStatus("Added to cart."); }}>
                  Add to cart instead
                </button>
              </div>
            )}
            <label>
              <span>Email for delivery</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
            </label>
            <label>
              <span>Name</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
            </label>
            <div className="checkout-payment-box">
              <div>
                <strong>Payment</strong>
                <p>Secure payment form placeholder. Connect this panel to Stripe Checkout or Payment Element.</p>
              </div>
              <span>SSL</span>
            </div>
            {status && <div className="album-cart-status">{status}</div>}
          </section>
          <aside className="ecom-summary">
            <h2>Order review</h2>
            {checkoutItems.length ? checkoutItems.map((item) => (
              <div key={item.id} className="summary-item">
                <span>{item.title}</span>
                <strong>{formatMoney(item.price)}</strong>
              </div>
            )) : <p className="summary-muted">No items selected.</p>}
            <div className="summary-row"><span>Delivery</span><strong>Instant download</strong></div>
            <div className="summary-total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
            <button type="button" className="btn btn-solid" onClick={placeOrder}>Place order</button>
            <p className="summary-note">Download links will be sent after checkout. A portion of proceeds goes to help those in need.</p>
          </aside>
        </div>
      </div>
      <EcommerceStyles />
    </main>
  );
}

function OrderConfirmation({ order }) {
  return (
    <main className="ecom-page">
      <div className="container">
        <div className="ecom-confirmation">
          <div className="eyebrow">Order confirmation</div>
          <h1 className="serif">Thank you for your order.</h1>
          <p>{order ? `Order ${order.id} is ready for ${order.email}.` : "Your order is ready."}</p>
          <div className="download-list">
            {(order?.items || []).map((item) => (
              <div key={item.id}>
                <span>{item.title}</span>
                <a href="#/resources">Download</a>
              </div>
            ))}
          </div>
          <a href="#/resources" className="btn btn-solid">Back to Worship</a>
        </div>
      </div>
      <EcommerceStyles />
    </main>
  );
}

function EcommerceStyles() {
  return (
    <style>{`
      .ecom-page { min-height: 72vh; padding: 54px 0 78px; background: var(--bg-soft); }
      .ecom-page-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 28px; }
      .ecom-page-head h1 { margin-top: 12px; font-size: clamp(34px, 5vw, 64px); font-weight: 400; }
      .ecom-grid { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 28px; align-items: start; }
      .ecom-panel, .ecom-summary, .ecom-empty, .ecom-confirmation { border: 1px solid var(--line); border-radius: 8px; background: var(--bg-elev); }
      .ecom-panel { padding: 14px 18px; }
      .cart-line { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--line-soft); }
      .cart-line:first-child { padding-top: 0; }
      .cart-line:last-child { border-bottom: 0; padding-bottom: 0; }
      .cart-line .mono { display: block; margin-bottom: 4px; color: var(--gold); font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; }
      .cart-line strong { display: block; font-size: 18px; line-height: 1.2; }
      .cart-line p { margin-top: 5px; color: var(--ink-dim); font-size: 12px; line-height: 1.35; }
      .cart-line-side { display: grid; justify-items: end; align-content: center; gap: 5px; }
      .cart-line-side button, .ecom-text-button, .checkout-selected-product button { color: var(--gold); font-size: 13px; font-weight: 700; }
      .ecom-summary { position: sticky; top: 92px; padding: 20px; }
      .ecom-summary h2 { margin-bottom: 18px; font-size: 22px; }
      .summary-row, .summary-item, .summary-total { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-top: 1px solid var(--line-soft); font-size: 14px; }
      .summary-total { align-items: center; margin-top: 8px; font-size: 17px; }
      .summary-total strong { font-size: 28px; }
      .ecom-summary .btn { width: 100%; justify-content: center; margin-top: 16px; }
      .summary-note, .summary-muted { margin-top: 14px; color: var(--ink-dim); font-size: 12px; line-height: 1.45; }
      .ecom-empty, .ecom-confirmation { padding: 46px; text-align: center; }
      .ecom-empty h2, .ecom-confirmation h1 { font-size: clamp(28px, 4vw, 48px); font-weight: 400; }
      .ecom-empty p, .ecom-confirmation p { max-width: 560px; margin: 14px auto 24px; color: var(--ink-dim); }
      .checkout-form { display: grid; gap: 16px; }
      .checkout-form label span { display: block; margin-bottom: 7px; font-size: 13px; font-weight: 700; }
      .checkout-form input { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); color: var(--ink); }
      .checkout-selected-product, .checkout-payment-box { padding: 16px; border: 1px solid var(--line); border-radius: 8px; background: var(--bg); }
      .checkout-selected-product .mono { color: var(--gold); font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; }
      .checkout-selected-product strong { display: block; margin-top: 8px; font-size: 20px; }
      .checkout-selected-product p, .checkout-payment-box p { margin: 6px 0 0; color: var(--ink-dim); font-size: 13px; }
      .checkout-payment-box { display: flex; justify-content: space-between; gap: 16px; }
      .checkout-payment-box span { color: #087a31; font-weight: 800; }
      .download-list { display: grid; gap: 8px; max-width: 640px; margin: 24px auto; }
      .download-list > div { display: flex; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid var(--line); border-radius: 8px; }
      .download-list a { color: var(--gold); font-weight: 800; }
      @media (max-width: 820px) {
        .ecom-page-head, .cart-line, .ecom-grid { grid-template-columns: 1fr; }
        .ecom-page-head { align-items: start; }
        .ecom-summary { position: static; }
        .cart-line-side { justify-items: start; }
      }
      @media (max-width: 560px) {
        .ecom-page { padding-top: 34px; }
        .ecom-empty, .ecom-confirmation { padding: 28px 18px; }
      }
    `}</style>
  );
}

function CheckoutStub({ slug }) {
  const product = EGH_DATA.products.find((p) => p.slug === slug);
  return (
    <div className="container" style={{ padding: "100px 0", textAlign: "center" }}>
      <div className="eyebrow">Checkout · Placeholder</div>
      <h1 className="serif" style={{ fontWeight: 400, marginTop: 16 }}>
        {product ? product.title : "Item"}
      </h1>
      <p style={{ color: "var(--ink-dim)", marginTop: 16, maxWidth: 480, margin: "16px auto" }}>
        Wire this to Stripe Checkout. The product slug above maps 1:1 to a Stripe price ID.
      </p>
      <a href="#/resources" className="btn" style={{ marginTop: 24 }}>← Back to Worship</a>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
