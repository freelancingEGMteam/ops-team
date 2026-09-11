/* global React */
const { useState, useEffect, useMemo, useRef } = React;

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Procedural cover art â€” deterministic per-album based on hue.
// Will be replaced by real <img src={coverUrl}> when assets land.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CoverArt({ hue = 200, label = "", small = false }) {
  const a = `oklch(0.40 0.12 ${hue})`;
  const b = `oklch(0.18 0.07 ${(hue + 30) % 360})`;
  const c = `oklch(0.08 0.04 ${(hue + 180) % 360})`;
  return (
    <div className="cover">
      <div
        className="cover-art"
        style={{
          background:
          `radial-gradient(ellipse at 28% 22%, ${a}, transparent 55%),` +
          `radial-gradient(ellipse at 75% 78%, ${b}, transparent 60%),` +
          `linear-gradient(160deg, ${c}, #060d18)`
        }} />
      
      {/* hairline halo / sun */}
      <svg
        className="cover-art"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.55 }}>
        
        <circle cx="100" cy="78" r="42" fill="none" stroke="rgba(255,235,180,0.7)" strokeWidth="0.4" />
        <circle cx="100" cy="78" r="58" fill="none" stroke="rgba(255,235,180,0.35)" strokeWidth="0.4" />
        <circle cx="100" cy="78" r="76" fill="none" stroke="rgba(255,235,180,0.18)" strokeWidth="0.4" />
        <line x1="0" y1="135" x2="200" y2="135" stroke="rgba(255,235,180,0.18)" strokeWidth="0.4" />
      </svg>
      <div className="cover-mark">EGM - {String(hue).padStart(3, "0")}</div>
      <div className="cover-mark-r">SIDE A</div>
      {!small && <div className="cover-label">{label}</div>}
      {small &&
      <div
        className="cover-label"
        style={{ fontSize: "clamp(12px, 4vw, 18px)" }}>
        
          {label}
        </div>
      }
    </div>);

}

// Video still placeholder
function VideoStill({ hue = 200, label = "video still", playing = false }) {
  return (
    <div className="still">
      <div
        className="still-grad"
        style={{
          background:
          `radial-gradient(ellipse at 30% 35%, oklch(0.45 0.12 ${hue} / 0.45), transparent 60%),` +
          `radial-gradient(ellipse at 75% 75%, rgba(0,0,0,0.7), transparent 70%)`
        }} />
      
      <div
        className="cover-art"
        style={{
          backgroundImage:
          "linear-gradient(135deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 16px)"
        }} />
      
      <div className="still-play">
        <PlayIconLarge playing={playing} />
      </div>
      <div className="still-label">Play - {label}</div>
      <div className="still-label" style={{ left: "auto", right: 16 }}>
        {playing ? "NOW PLAYING" : "READY"}
      </div>
    </div>);

}

function PlayIconLarge({ playing }) {
  return (
    <div
      style={{
        width: 64,
        height: 64,
        border: "1px solid rgba(236,223,191,0.6)",
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: "color-mix(in srgb, var(--bg) 50%, transparent)",
        backdropFilter: "blur(2px)"
      }}>
      
      {playing ?
      <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 4, height: 18, background: "var(--gold-bright)" }} />
          <span style={{ width: 4, height: 18, background: "var(--gold-bright)" }} />
        </div> :

      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "16px solid var(--gold-bright)",
          borderTop: "10px solid transparent",
          borderBottom: "10px solid transparent",
          marginLeft: 4
        }} />

      }
    </div>);

}

// Small icons (inline SVGs only)
const Icon = {
  play: (p) =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" {...p}>
      <path d="M3 1.5v11l9.5-5.5z" />
    </svg>,

  pause: (p) =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" {...p}>
      <rect x="3" y="2" width="3" height="10" />
      <rect x="8" y="2" width="3" height="10" />
    </svg>,

  search: (p) =>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <circle cx="7" cy="7" r="5" />
      <path d="m11 11 4 4" strokeLinecap="round" />
    </svg>,

  download: (p) =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M7 1v9m0 0 3-3m-3 3L4 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h10" strokeLinecap="round" />
    </svg>,

  arrow: (p) =>
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M2 7h10m0 0L8 3m4 4L8 11" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,

  menu: (p) =>
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M3 6h16M3 11h16M3 16h16" strokeLinecap="round" />
    </svg>,

  x: (p) =>
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <path d="M5 5l12 12M17 5L5 17" strokeLinecap="round" />
    </svg>,

  chevron: (p) =>
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="m3 4 3 4 3-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>,

  cart: (p) =>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="M2 2h1.8l1.4 7.1a1.4 1.4 0 0 0 1.4 1.1h5.5a1.4 1.4 0 0 0 1.3-.9L15 5H4.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6.5" cy="13.2" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="12" cy="13.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>

};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Navigation
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Nav({ route, onNavigate, cartCount = 0 }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {return localStorage.getItem("egh-theme") || "dark";} catch (e) {return "dark";}
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {localStorage.setItem("egh-theme", theme);} catch (e) {}
  }, [theme]);
  const toggleTheme = () => setTheme((t) => t === "dark" ? "light" : "dark");
  const items = [
  { href: "#/", label: "Home" },
  { href: "#/bibleinvideo", label: "BibleInVideo" },
  { href: "#/resources", label: "Worship" },
  { href: "#/about", label: "About" },
  { href: "#/contact", label: "Contact" }];

  return (
    <header
      className="site-header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#0b1a2e",
        backdropFilter: "none",
        borderBottom: "1px solid rgba(255,255,255,0.08)"
      }}>
      
      <div
        className="container-wide"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 0"
        }}>
        
        <a
          href="#/"
          onClick={() => setOpen(false)}
          style={{ display: "flex", alignItems: "center", gap: 12 }}>
          
          <Monogram />
          <div>
            <div
              className="serif brand-wordmark"
              style={{ fontSize: 20, lineHeight: 1, fontWeight: 500, whiteSpace: "nowrap" }}>EternalGrace Hub


            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.28em",
                color: "var(--ink-soft)",
                marginTop: 4,
                textTransform: "uppercase"
              }}>


            </div>
          </div>
        </a>

        <nav
          aria-label="Primary"
          style={{ display: "flex", gap: 28, alignItems: "center" }}
          className="nav-desktop">
          
          {items.map((i) => {
            const active =
            i.href === "#/" ?
            route === "/" || route === "" :
            route.startsWith(i.href.slice(1));
            return (
              <a
                key={i.href}
                href={i.href}
                style={{
                  fontSize: 13,
                  letterSpacing: "0.08em",
                  color: "#ffffff",
                  opacity: active ? 1 : 0.75,
                  borderBottom: active ?
                  "1px solid rgba(255,255,255,0.7)" :
                  "1px solid transparent",
                  paddingBottom: 2,
                  transition: "color 200ms"
                }}>
                
                {i.label}
              </a>);

          })}
          <a
            href="#/search"
            aria-label="Search the site"
            title="Search"
            className="nav-search-link">
            <Icon.search />
            <span>Search</span>
          </a>
          <a href="#/cart" className="nav-cart-link" aria-label={`Cart with ${cartCount} item${cartCount === 1 ? "" : "s"}`}>
            <Icon.cart />
            <span>Cart</span>
            <b>{cartCount}</b>
          </a>
          <a href="#/resources" className="btn btn-sm">
            Free Downloads
          </a>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to day mode" : "Switch to night mode"}
            title={theme === "dark" ? "Day mode" : "Night mode"}
            style={{
              width: 34, height: 34,
              borderRadius: "50%",
              border: "1px solid var(--line)",
              color: "var(--ink-dim)",
              display: "grid", placeItems: "center",
              transition: "color 200ms, border-color 200ms"
            }}
            onMouseEnter={(e) => {e.currentTarget.style.color = "var(--gold-bright)";e.currentTarget.style.borderColor = "var(--gold)";}}
            onMouseLeave={(e) => {e.currentTarget.style.color = "var(--ink-dim)";e.currentTarget.style.borderColor = "var(--line)";}}>
            
            {theme === "dark" ?
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
                <circle cx="7.5" cy="7.5" r="3" />
                <path d="M7.5 1v1.5M7.5 12.5V14M1 7.5h1.5M12.5 7.5H14M3 3l1 1M11 11l1 1M3 12l1-1M11 4l1-1" strokeLinecap="round" />
              </svg> :

            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2">
                <path d="M12.5 9.2A5 5 0 0 1 5.8 2.5a5.5 5.5 0 1 0 6.7 6.7Z" strokeLinejoin="round" />
              </svg>
            }
          </button>
        </nav>

        <button
          aria-label="Open menu"
          className="nav-mobile-btn"
          onClick={() => setOpen(true)}
          style={{ color: "var(--ink)" }}>
          
          <Icon.menu />
        </button>
      </div>

      {open &&
      <div
        className="mobile-menu-overlay"
        style={{
          position: "fixed",
          inset: 0,
          background: "var(--overlay-bg)",
          zIndex: 1000,
          padding: 24,
          width: "100vw",
          minHeight: "100vh",
          overflowY: "auto"
        }}>
        
          <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40
          }}>
          
            <Monogram />
            <button onClick={() => setOpen(false)} aria-label="Close">
              <Icon.x />
            </button>
          </div>
          <nav className="mobile-menu-nav" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {items.map((i) =>
          <a
            key={i.href}
            href={i.href}
            onClick={() => setOpen(false)}
            className="serif"
            style={{ fontSize: 32, color: "var(--ink)" }}>
            
                {i.label}
              </a>
          )}
            <a
            href="#/search"
            onClick={() => setOpen(false)}
            className="serif"
            style={{ fontSize: 32, color: "var(--ink)" }}>
            
              Search
            </a>
            <a
            href="#/cart"
            onClick={() => setOpen(false)}
            className="serif"
            style={{ fontSize: 32, color: "var(--ink)" }}>
            
              Cart {cartCount ? `(${cartCount})` : ""}
            </a>
            <a
            href="#/resources"
            onClick={() => setOpen(false)}
            className="btn"
            style={{ marginTop: 16, alignSelf: "flex-start" }}>
            
              Free Downloads
            </a>
          </nav>
        </div>
      }

      <style>{`
        .nav-desktop { display: flex; }
        .nav-mobile-btn { display: none; }
        .nav-search-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(255,255,255,0.24);
          border-radius: 999px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          opacity: 0.86;
        }
        .nav-search-link:hover {
          border-color: var(--gold);
          color: var(--gold-bright);
          opacity: 1;
        }
        .nav-cart-link {
          min-height: 34px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #ffffff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.84;
        }
        .nav-cart-link b {
          min-width: 19px;
          height: 19px;
          display: inline-grid;
          place-items: center;
          padding: 0 5px;
          border-radius: 999px;
          background: var(--gold);
          color: var(--on-gold);
          font-size: 11px;
          line-height: 1;
          letter-spacing: 0;
        }
        .nav-cart-link:hover {
          color: var(--gold-bright);
          opacity: 1;
        }
        @media (max-width: 1120px) and (min-width: 881px) {
          .nav-desktop {
            gap: 16px !important;
          }
          .nav-desktop > a {
            font-size: 12px !important;
          }
          .brand-wordmark {
            font-size: 18px !important;
          }
          .nav-search-link span {
            display: none;
          }
          .nav-search-link {
            width: 36px;
            justify-content: center;
            padding: 0;
          }
          header.site-header .btn-sm {
            min-height: 34px;
            padding: 0 14px;
            font-size: 11px;
          }
        }
        @media (max-width: 880px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: block !important; }
        }
      `}</style>
    </header>);

}

function Monogram() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
      <rect x="1" y="1" width="38" height="38" stroke="var(--gold)" strokeWidth="0.6" />
      <text
        x="20"
        y="26"
        textAnchor="middle"
        fontFamily="Inter, system-ui, -apple-system, sans-serif"
        fontStyle="italic"
        fontSize="22"
        fill="var(--gold-bright)"
        fontWeight="500">
        
        eg
      </text>
    </svg>);

}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Footer
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Footer() {
  return (
    <footer
      className="site-footer">
      <div className="container-wide footer-inner">
        <div className="footer-top">
          <a href="#/" className="footer-brand" aria-label="EternalGrace Hub home">
            <Monogram />
            <span>EternalGrace Hub</span>
          </a>
          <FooterCol
            title="Hub"
            links={[
              ["#/resources", "Worship"],
              ["#/about", "About"],
              ["#/contact", "Contact"],
              ["#/admin", "Admin"],
              ["#/privacy", "Privacy"],
              ["#/terms", "Terms"],
              ["#/refund-policy", "Refunds"],
            ]}
          />
        </div>

        <div className="footer-bottom">
          <div>2026 EternalGrace Hub - All rights reserved</div>
          <div>"He hath made every thing beautiful in his time." - Eccl. 3:11</div>
        </div>
      </div>
      <style>{`
        .site-footer {
          margin-top: 48px;
          border-top: 1px solid var(--line);
          background:
            radial-gradient(ellipse at 12% 0%, rgba(201, 166, 97, 0.13), transparent 42%),
            linear-gradient(180deg, #0d2138 0%, #081422 100%);
          color: #e6e0cc;
          font-family: var(--sans);
        }
        .footer-inner {
          padding: 28px 0 18px;
        }
        .footer-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 28px;
          padding-bottom: 24px;
        }
        .footer-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: #f3eedb;
          font-size: 18px;
          font-weight: 700;
          white-space: nowrap;
        }
        .footer-link-group {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }
        .footer-link-title {
          color: var(--gold-bright);
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          margin-right: 4px;
        }
        .footer-link-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          flex-wrap: wrap;
          gap: 8px;
        }
        .footer-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 14px;
          border: 1px solid rgba(230, 201, 135, 0.22);
          border-radius: 8px;
          color: #e6e0cc;
          background: rgba(255,255,255,0.035);
          font-size: 14px;
          transition: border-color 180ms ease, background 180ms ease, color 180ms ease, transform 180ms ease;
        }
        .footer-link:hover,
        .footer-link:focus-visible {
          color: var(--gold-bright);
          border-color: rgba(230, 201, 135, 0.58);
          background: rgba(230, 201, 135, 0.08);
          transform: translateY(-1px);
        }
        .footer-bottom {
          padding-top: 18px;
          border-top: 1px solid var(--line-soft);
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 12px;
          color: var(--ink-soft);
          letter-spacing: 0.02em;
        }
        @media (max-width: 880px) {
          .footer-top {
            align-items: flex-start;
            flex-direction: column;
          }
          .footer-link-group,
          .footer-link-list {
            justify-content: flex-start;
            width: 100%;
          }
        }
        @media (max-width: 520px) {
          .footer-inner {
            padding-top: 24px;
          }
          .footer-link-title {
            width: 100%;
          }
          .footer-link-list {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .footer-link {
            width: 100%;
            min-height: 46px;
          }
          .footer-bottom {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </footer>);

}
function FooterCol({ title, links }) {
  return (
    <nav className="footer-link-group" aria-label={title}>
      <div className="footer-link-title">
        {title}
      </div>
      <ul className="footer-link-list">
        {links.map(([href, label]) =>
        <li key={href}>
            <a
            href={href}
            className="footer-link">
            
              {label}
            </a>
          </li>
        )}
      </ul>
    </nav>);

}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Audio player â€” fake but believable (animates time forward)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function parseTime(s) {
  const [m, sec] = s.split(":").map((x) => parseInt(x, 10));
  return m * 60 + sec;
}
function fmtTime(seconds) {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function MiniPlayer({ duration = "3:30", playing, onToggle, compact = false }) {
  const total = parseTime(duration);
  const [pos, setPos] = useState(0);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () => setPos((p) => p + 1 >= total ? 0 : p + 1),
      1000
    );
    return () => clearInterval(id);
  }, [playing, total]);
  const pct = pos / total * 100;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 10 : 14,
        width: "100%"
      }}>
      
      <button
        onClick={onToggle}
        aria-label={playing ? "Pause" : "Play"}
        style={{
          width: compact ? 32 : 40,
          height: compact ? 32 : 40,
          borderRadius: "50%",
          border: "1px solid var(--gold)",
          color: playing ? "var(--on-gold)" : "var(--gold-bright)",
          background: playing ? "var(--gold)" : "transparent",
          display: "grid",
          placeItems: "center",
          flexShrink: 0
        }}>
        
        {playing ? <Icon.pause /> : <Icon.play />}
      </button>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div
          style={{
            height: 2,
            background: "var(--line-soft)",
            position: "relative"
          }}>
          
          <div
            style={{
              position: "absolute",
              inset: 0,
              width: `${pct}%`,
              background: "var(--gold)",
              transition: "width 1s linear"
            }} />
          
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-soft)",
            display: "flex",
            justifyContent: "space-between",
            letterSpacing: "0.1em"
          }}>
          
          <span>{fmtTime(pos)}</span>
          <span>{duration}</span>
        </div>
      </div>
    </div>);

}

// Sticky bottom player (global)
function StickyPlayer({ state, onToggle, onClose }) {
  if (!state) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        background: "var(--player-bg)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--gold)"
      }}>
      
      <div
        className="container-wide"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 0"
        }}>
        
        <div style={{ width: 44, height: 44, flexShrink: 0 }}>
          <CoverArt hue={state.hue} label="" small />
        </div>
        <div className="sticky-player-meta" style={{ minWidth: 0, flex: "0 0 auto", width: 220 }}>
          <div
            className="serif"
            style={{
              fontSize: 16,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}>
            
            {state.title}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: "var(--ink-soft)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginTop: 2
            }}>
            
            {state.album}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <MiniPlayer
            duration={state.duration}
            playing={state.playing}
            onToggle={onToggle}
            compact />
          
        </div>
        <button
          onClick={onClose}
          aria-label="Close player"
          style={{ color: "var(--ink-soft)", padding: 8 }}>
          
          <Icon.x />
        </button>
      </div>
    </div>);

}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Misc small bits
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ScriptureBanner() {
  const verses = [
  "He restoreth my soul. â€” Ps. 23:3",
  "Behold, I make all things new. â€” Rev. 21:5",
  "The light shineth in darkness. â€” Jn. 1:5",
  "Be still, and know. â€” Ps. 46:10",
  "My grace is sufficient for thee. â€” 2 Cor. 12:9",
  "Lo, I am with you alway. â€” Mt. 28:20"];

  const content =
  <span>
      {verses.map((v, i) =>
    <span key={i}>{v}</span>
    )}
    </span>;

  return (
    <div className="scripture-banner">
      <div className="track">
        {content}
        {content}
      </div>
    </div>);

}

function PageHeader({ eyebrow, title, sub, children, variant = "default" }) {
  return (
    <div className={`page-header page-header-${variant}`}>
      <div className="container">
        <div className="eyebrow">{eyebrow}</div>
        <h1
          className="serif page-header-title">
          
          {title}
        </h1>
        {sub &&
        <p
          className="page-header-sub">
          
            {sub}
          </p>
        }
        {children && <div className="page-header-actions">{children}</div>}
      </div>
    </div>);

}

function EmptyState({ title, sub }) {
  return (
    <div
      style={{
        border: "1px dashed var(--line)",
        padding: "60px 24px",
        textAlign: "center",
        color: "var(--ink-dim)"
      }}>
      
      <div className="hairline-cross" style={{ margin: "0 auto 16px" }} />
      <div className="serif" style={{ fontSize: 22, color: "var(--ink)" }}>
        {title}
      </div>
      {sub &&
      <p style={{ marginTop: 8, fontSize: 14, maxWidth: 480, margin: "8px auto 0" }}>
          {sub}
        </p>
      }
    </div>);

}

// Expose
Object.assign(window, {
  CoverArt,
  VideoStill,
  Icon,
  Nav,
  Footer,
  MiniPlayer,
  StickyPlayer,
  ScriptureBanner,
  PageHeader,
  EmptyState,
  parseTime,
  fmtTime
});
