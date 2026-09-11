/* global React, EGH_DATA */
const { useState, useMemo, useEffect } = React;

// ============================================================
// HOME
// ============================================================
function HomePage({ play }) {
  return (
    <div>
      {/* Hero â”€ split dual entry */}
      <section className="home-hero-section">
        <div className="hero-split">
          <HeroPane
            tone="watch"
            eyebrow=""
            title="Faith-building films for every screen"
            sub="Cinematic Bible stories for families, churches, and personal devotion."
            cta="Watch episodes"
            href="#/bibleinvideo"
            hue={28}
            label="LAZARUS - 18:42"
            verse="" />
          
          <div className="hero-divider" />
          <HeroPane
            tone="listen"
            eyebrow=""
            title="Worship music for home and church"
            sub="Every mp3, lyric, chord sheet you need to lead your congregation or to practice at home"
            cta="Hear the albums"
            href="#/resources"
            hue={200}
            label="ALIVE AGAIN"
            verse="" />
          
        </div>
      </section>

      <ScriptureBanner />

      {/* Start Here */}
      <section className="new-family-section">
        <div className="container">
          <div className="new-family-grid">
            <div className="new-family-copy">
              <div className="eyebrow">Start Here</div>
              <h2 className="serif" style={{ marginTop: 12, fontWeight: 400 }}>
                If you are new to the family
              </h2>
              <p>
                Eternal Grace Hub brings together cinematic Bible stories, worship albums, and practical resources for homes, churches, and small groups. We create media that helps people see scripture clearly, sing with confidence, and carry the grace of Christ into everyday life.
              </p>
            </div>
            <div className="new-family-image-wrap">
              <img
                src="uploads/pasted-1778596394226-0.png"
                alt="Eternal Grace Hub preview"
                className="new-family-image" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured albums strip */}
      <section className="latest-releases-section">
        <div className="container">
          <SectionHeader eyebrow="Latest Releases" title="From EternalGrace Music" link={["#/resources", "All albums"]} />
          <div className="album-strip">
            {EGH_DATA.albums.slice(0, 6).map((a) =>
            <AlbumCard key={a.slug} album={a} />
            )}
          </div>
        </div>
      </section>

      {/* Featured videos */}
      <section className="video-story-section">
        <div className="container">
          <SectionHeader eyebrow="Cinematic Storytelling" title="From BibleInVideo." link={["#/bibleinvideo", "All stories"]} />
          <div className="video-grid">
            {EGH_DATA.videos.slice(0, 6).map((v) =>
            <VideoCard key={v.slug} video={v} />
            )}
          </div>
        </div>
      </section>

      <style>{`
        .home-hero-section {
          padding: 28px 0 24px;
          border-bottom: 1px solid var(--line);
          background:
            radial-gradient(ellipse at 50% 0%, rgba(201, 166, 97, 0.08), transparent 48%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg-deep) 78%, transparent), var(--bg));
        }
        .hero-split {
          width: min(1180px, calc(100% - 48px));
          margin: 0 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }
        .hero-divider { display: none; }
        .hero-pane {
          border: 1px solid color-mix(in srgb, var(--gold) 24%, var(--line));
          border-radius: 8px;
          box-shadow: 0 24px 64px -48px rgba(0,0,0,0.72);
          transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, filter 180ms ease;
          isolation: isolate;
          will-change: transform;
        }
        .hero-pane::before {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background: linear-gradient(135deg, rgba(255,255,255,0.08), transparent 45%);
          opacity: 0;
          transition: opacity 220ms ease;
        }
        .hero-pane > * { position: relative; z-index: 1; }
        .hero-pane:hover {
          transform: translateY(-3px);
          z-index: 3;
          border-color: color-mix(in srgb, var(--gold) 52%, var(--line));
          box-shadow: 0 30px 72px -46px rgba(0,0,0,0.78);
          filter: saturate(1.05);
        }
        .hero-pane:hover::before { opacity: 1; }
        .hero-title { font-size: clamp(34px, 4vw, 54px); line-height: 1.08; }
        .hero-title {
          color: var(--ink);
          text-shadow:
            0 1px 0 color-mix(in srgb, var(--gold-bright) 42%, transparent),
            0 10px 24px rgba(0,0,0,0.28),
            0 26px 56px rgba(0,0,0,0.22);
          transform: translateZ(0);
        }
        .hero-pane:hover .hero-title {
          text-shadow:
            0 1px 0 color-mix(in srgb, var(--gold-bright) 55%, transparent),
            0 14px 28px rgba(0,0,0,0.34),
            0 32px 70px rgba(0,0,0,0.28);
        }
        :root[data-theme="light"] .hero-title {
          text-shadow:
            0 1px 0 rgba(255,255,255,0.65),
            0 10px 22px rgba(20,17,11,0.13),
            0 24px 48px rgba(20,17,11,0.12);
        }
        .hero-pane-watch {
          background:
            radial-gradient(ellipse at 72% 24%, rgba(168, 72, 58, 0.26), transparent 58%),
            linear-gradient(145deg, #12243a 0%, #0b1628 64%, #08111e 100%) !important;
        }
        .hero-pane-listen {
          background:
            radial-gradient(ellipse at 28% 70%, rgba(0, 138, 140, 0.24), transparent 58%),
            linear-gradient(145deg, #081824 0%, #07111f 62%, #050b16 100%) !important;
        }
        :root[data-theme="light"] .hero-pane-watch {
          background:
            radial-gradient(ellipse at 70% 22%, rgba(54, 118, 170, 0.18), transparent 56%),
            linear-gradient(145deg, #eaf6ff 0%, #dceffc 58%, #f7fbff 100%) !important;
        }
        :root[data-theme="light"] .hero-pane-listen {
          background:
            radial-gradient(ellipse at 28% 72%, rgba(154, 125, 60, 0.18), transparent 56%),
            linear-gradient(145deg, #fffaf0 0%, #f4efe3 58%, #fffdf8 100%) !important;
        }
        .hero-pane-copy {
          max-width: 520px;
        }
        .hero-pane-copy p {
          margin-top: 20px;
          color: var(--ink-dim);
          max-width: 440px;
          font-size: 16px;
          line-height: 1.58;
        }
        .hero-actions {
          margin-top: 30px;
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .hero-cta {
          min-height: 48px;
          padding: 0 22px;
          justify-content: center;
        }
        .new-family-section { padding: 56px 0; }
        .new-family-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 44px;
          align-items: center;
        }
        .new-family-copy p {
          margin-top: 22px;
          max-width: 620px;
          color: var(--ink-dim);
          font-size: 18px;
          line-height: 1.65;
        }
        .new-family-image-wrap {
          border: 1px solid var(--line);
          border-radius: 8px;
          overflow: hidden;
          background: var(--bg-elev);
          box-shadow: 0 28px 70px -52px rgba(0,0,0,0.72);
          aspect-ratio: 16 / 10;
        }
        .new-family-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
          object-position: center 48%;
        }
        .latest-releases-section {
          padding: 40px 0 48px;
          border-top: 1px solid color-mix(in srgb, var(--gold) 34%, transparent);
          border-bottom: 1px solid color-mix(in srgb, var(--gold) 22%, transparent);
          background:
            radial-gradient(ellipse at 18% 18%, rgba(201, 166, 97, 0.18), transparent 46%),
            radial-gradient(ellipse at 82% 72%, rgba(82, 54, 128, 0.18), transparent 54%),
            linear-gradient(180deg, #141520 0%, #111927 48%, var(--bg) 100%);
        }
        :root[data-theme="light"] .latest-releases-section {
          background:
            radial-gradient(ellipse at 18% 18%, rgba(201, 166, 97, 0.22), transparent 46%),
            radial-gradient(ellipse at 82% 72%, rgba(96, 70, 132, 0.14), transparent 54%),
            linear-gradient(180deg, #fff8e8 0%, #f7efe1 58%, var(--bg) 100%);
        }
        .video-story-section {
          padding: 48px 0 58px;
          border-top: 1px solid color-mix(in srgb, #7fb7d7 24%, var(--line));
          border-bottom: 1px solid var(--line);
          background:
            radial-gradient(ellipse at 14% 18%, rgba(0, 138, 140, 0.16), transparent 48%),
            radial-gradient(ellipse at 86% 70%, rgba(74, 61, 132, 0.12), transparent 54%),
            linear-gradient(180deg, #071522 0%, #0a1725 100%);
        }
        :root[data-theme="light"] .video-story-section {
          background:
            radial-gradient(ellipse at 14% 18%, rgba(56, 135, 170, 0.16), transparent 48%),
            radial-gradient(ellipse at 86% 70%, rgba(74, 61, 132, 0.10), transparent 54%),
            linear-gradient(180deg, #eef8ff 0%, #f8fbff 100%);
        }
        .video-story-section .video-grid {
          gap: 18px;
        }
        .video-story-section .video-grid > a {
          min-height: 100%;
          padding: 14px;
          border: 1px solid color-mix(in srgb, #7fb7d7 22%, var(--line));
          border-radius: 8px;
          background: color-mix(in srgb, var(--bg-elev) 70%, transparent);
          box-shadow: 0 22px 54px -44px rgba(0,0,0,0.7);
          transition: transform 180ms ease, border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
        }
        .video-story-section .video-grid > a:hover {
          transform: translateY(-3px);
          border-color: color-mix(in srgb, #7fb7d7 48%, var(--gold));
          background: color-mix(in srgb, var(--bg-elev) 88%, transparent);
          box-shadow: 0 28px 64px -44px rgba(0,0,0,0.78);
        }
        .video-story-section .still {
          border-radius: 6px;
          overflow: hidden;
          aspect-ratio: 16 / 9;
        }
        .video-story-section .video-grid h3 {
          margin-top: 14px !important;
        }
        .start-card {
          border: 1px solid var(--line) !important;
          border-radius: 8px;
          background: var(--bg-elev) !important;
          box-shadow: 0 18px 40px -32px rgba(0,0,0,0.58);
          transition: transform 220ms ease, border-color 220ms ease, box-shadow 220ms ease, background 220ms ease;
        }
        .start-card:hover {
          background: var(--bg-elev-2) !important;
          box-shadow: 0 24px 56px -34px rgba(0,0,0,0.7), 0 0 0 1px var(--gold-soft);
        }
        .album-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
        .video-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        @media (max-width: 880px) {
          .home-hero-section { padding-top: 18px; }
          .hero-split { width: min(100% - 32px, 560px); grid-template-columns: 1fr; }
          .hero-pane { min-height: 340px !important; }
          .new-family-grid { grid-template-columns: 1fr; gap: 28px; }
          .album-strip, .video-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>);

}

function HeroPane({ eyebrow, title, sub, cta, href, hue, label, verse, tone }) {
  return (
    <div
      style={{
        position: "relative",
        padding: "42px clamp(28px, 4vw, 52px)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 0,
        overflow: "hidden",
        background:
        tone === "watch" ?
        `radial-gradient(ellipse at 70% 30%, oklch(0.22 0.07 ${hue}), transparent 65%), var(--bg)` :
        `radial-gradient(ellipse at 30% 70%, oklch(0.22 0.07 ${hue}), transparent 65%), var(--bg)`, minHeight: "430px"
      }}
      className={`hero-pane ${tone === "watch" ? "hero-pane-watch" : "hero-pane-listen"}`}>
      
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}

      <div className="hero-pane-copy">
        <h1 className="serif hero-title" style={{ fontWeight: 700, maxWidth: 540, letterSpacing: "0" }}>{title}</h1>
        <p>
          {sub}
        </p>
        <div className="hero-actions">
          <a href={href} className="btn hero-cta">
            {cta} <Icon.arrow />
          </a>
          {verse && <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>
            {verse}
          </div>}
        </div>
      </div>

      <div />
    </div>);

}

function SectionHeader({ eyebrow, title, link }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 36, flexWrap: "wrap", gap: 12 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="serif" style={{ marginTop: 12, fontWeight: 400 }}>{title}</h2>
      </div>
      {link &&
      <a href={link[0]} style={{ color: "var(--gold-bright)", fontSize: 13, letterSpacing: "0.1em", display: "inline-flex", alignItems: "center", gap: 8 }}>
          {link[1]} <Icon.arrow />
        </a>
      }
    </div>);

}

function StartCard({ n, kicker, title, body, href, hue }) {
  return (
    <a href={href} className="lift start-card" style={{ padding: "32px 28px", background: "var(--bg)", display: "block", position: "relative", minHeight: 260, border: "1px solid transparent" }}>
      <div className="mono" style={{ fontSize: 34, color: `oklch(0.52 0.10 ${hue})`, fontWeight: 700, letterSpacing: "0.02em" }}>{n}</div>
      {kicker && <div className="kicker" style={{ marginTop: 28, color: "var(--gold)" }}>{kicker}</div>}
      <h3 className="serif" style={{ marginTop: 22, fontWeight: 700, letterSpacing: "0" }}>{title}</h3>
      <p style={{ marginTop: 14, color: "var(--ink-dim)", fontSize: 15 }}>{body}</p>
      <div style={{ marginTop: 28, display: "inline-flex", gap: 8, alignItems: "center", color: "var(--gold-bright)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>
        Begin <Icon.arrow />
      </div>
    </a>);

}

function AlbumCard({ album }) {
  return (
    <a href={`#/music/albums/${album.slug}`} className="lift" style={{ display: "block" }}>
      <div className="item-shadow">
        <CoverArt hue={album.coverHue} label={album.coverLabel} />
      </div>
      <div style={{ marginTop: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 className="serif" style={{ fontSize: 24, fontWeight: 500 }}>{album.title}</h3>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.18em", marginTop: 4, textTransform: "uppercase" }}>
            {album.tracks.length} tracks - {album.runtime} - {album.year}
          </div>
        </div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--gold)", letterSpacing: "0.16em" }}>LP</div>
      </div>
      <p style={{ marginTop: 10, color: "var(--ink-dim)", fontSize: 14, fontStyle: "italic" }}>
        {album.scripture}
      </p>
    </a>);

}

function VideoCard({ video }) {
  return (
    <a href={`#/bibleinvideo/${video.slug}`} className="lift" style={{ display: "block" }}>
      <div className="item-shadow">
        <VideoStill hue={video.hue} label={`${video.book} - ${video.passage}`} />
      </div>
      <h3 className="serif" style={{ fontSize: 22, fontWeight: 500, marginTop: 16 }}>{video.title}</h3>
      <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.16em", marginTop: 6, textTransform: "uppercase" }}>
        {video.testament} - {video.runtime}
      </div>
    </a>);

}

// ============================================================
// BIBLEINVIDEO  LIBRARY
// ============================================================
function BibleInVideoPage() {
  const [q, setQ] = useState("");
  const [testament, setTestament] = useState("all");
  const videos = EGH_DATA.videos;
  const featuredVideo = videos[0];
  const heroesOfFaith = ["elijah-fire-from-heaven", "david-and-goliath", "esther-for-such-a-time", "ruth-the-redeemer"];
  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (testament === "heroes" && !heroesOfFaith.includes(v.slug)) return false;
      if (testament !== "all" && testament !== "heroes" && v.testament !== testament) return false;
      if (!q) return true;
      const hay = `${v.title} ${v.book} ${v.passage} ${(v.themes || []).join(" ")}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
  }, [q, testament]);
  return (
    <div>
      <div className="biv-episodes-header">
      <PageHeader
        eyebrow="BibleInVideo Episodes"
        title="Cinematic storytelling to drive you closer to God"
        sub="Cinematic short films of scripture's most consequential moments. Watch on your phone, your TV, or the wall of the youth room." />
      </div>

      <div className="container">
        {featuredVideo && (
          <section className="featured-episode">
            <a href={`#/bibleinvideo/${featuredVideo.slug}`} className="featured-episode-video">
              <VideoStill hue={featuredVideo.hue} label={`${featuredVideo.book} · ${featuredVideo.passage}`} />
            </a>
            <div className="featured-episode-copy">
              <div className="eyebrow">Featured Episode</div>
              <h2 className="serif">{featuredVideo.title}</h2>
              <p>{featuredVideo.summary}</p>
              <div className="featured-episode-meta">
                <span>{featuredVideo.passage}</span>
                <span>{featuredVideo.runtime}</span>
                <span>{featuredVideo.year}</span>
              </div>
              <a href={`#/bibleinvideo/${featuredVideo.slug}`} className="btn btn-solid">
                Watch episode <Icon.arrow />
              </a>
            </div>
          </section>
        )}

        <div className="episode-filter-toolbar">
          <div className="episode-search">
            <Icon.search style={{ position: "absolute", left: 14, top: 14, color: "var(--ink-soft)" }} />
            <input
              className="search-input"
              placeholder="Search stories, books, themes..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 40 }} />
          </div>
          <div className="episode-filter-chips">
            {["all", "Old Testament", "New Testament", "heroes"].map((t) =>
            <button
              key={t}
              type="button"
              onClick={() => setTestament(t)}
              className={`chip ${testament === t ? "active" : ""}`}>
                {t === "all" ? "All stories" : t === "heroes" ? "Heroes of the faith" : t}
              </button>
            )}
          </div>
          <div className="mono episode-count">
            {filtered.length}/{videos.length} STORIES
          </div>
        </div>

        {filtered.length === 0 ?
        <EmptyState
          title="Nothing in this scroll yet."
          sub="Try clearing the filter, or searching for a different book or theme." /> :


        <div className="video-grid-lg">
            {filtered.map((v) =>
          <VideoCard key={v.slug} video={v} />
          )}
          </div>
        }
      </div>

      <style>{`
        .biv-episodes-header .page-header-title {
          max-width: 1120px;
          font-size: clamp(36px, 4.8vw, 56px);
        }
        .biv-episodes-header .page-header-sub {
          max-width: 980px;
        }
        .featured-episode {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
          gap: 32px;
          align-items: center;
          margin-bottom: 42px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background:
            radial-gradient(ellipse at 82% 22%, rgba(201, 166, 97, 0.10), transparent 48%),
            var(--bg-elev);
          box-shadow: 0 24px 64px -52px rgba(0,0,0,0.62);
        }
        .featured-episode-video {
          display: block;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 20px 48px -34px rgba(0,0,0,0.75);
        }
        .featured-episode-video .still {
          aspect-ratio: 16 / 9;
        }
        .featured-episode-copy {
          padding: 12px 10px 12px 0;
        }
        .featured-episode-copy h2 {
          margin-top: 12px;
          font-weight: 500;
          font-size: clamp(30px, 4vw, 46px);
        }
        .featured-episode-copy p {
          margin-top: 16px;
          color: var(--ink-dim);
          font-size: 17px;
          line-height: 1.6;
        }
        .featured-episode-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 22px 0;
        }
        .featured-episode-meta span {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border: 1px solid var(--line);
          border-radius: 999px;
          color: var(--ink-soft);
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .episode-filter-toolbar {
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
        .episode-search {
          position: relative;
          flex: 1 1 320px;
          max-width: 440px;
        }
        .episode-filter-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .episode-count {
          margin-left: auto;
          font-size: 11px;
          color: var(--ink-soft);
          letter-spacing: 0.16em;
        }
        .video-grid-lg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        @media (max-width: 880px) {
          .featured-episode { grid-template-columns: 1fr; padding: 14px; }
          .featured-episode-copy { padding: 6px 4px 4px; }
          .featured-episode-copy .btn { width: 100%; justify-content: center; }
          .episode-search { max-width: none; flex-basis: 100%; }
          .episode-filter-chips .chip { flex: 1 1 auto; justify-content: center; }
          .episode-count { width: 100%; margin-left: 0; text-align: right; }
          .video-grid-lg { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>);

}

// ============================================================
// BIBLEINVIDEO DETAIL
// ============================================================
function VideoDetailPage({ slug }) {
  const video = EGH_DATA.videos.find((v) => v.slug === slug);
  const [playing, setPlaying] = useState(false);
  if (!video) return <NotFound to="#/bibleinvideo" label="Back to library" />;

  const relatedAlbum = video.relatedAlbum ?
  EGH_DATA.albums.find((a) => a.slug === video.relatedAlbum) :
  null;

  return (
    <div>
      {/* Player */}
      <div style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)" }}>
        <div className="container-wide" style={{ padding: "32px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
            <a href="#/bibleinvideo" className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>
              Back to BibleInVideo
            </a>
            <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>
              / {video.book.toUpperCase()} / {video.runtime}
            </div>
          </div>
          <button onClick={() => setPlaying((p) => !p)} style={{ width: "100%", display: "block" }}>
            <VideoStill hue={video.hue} label={video.passage} playing={playing} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="container video-detail-section" style={{ padding: "60px 0" }}>
        <div className="video-detail-grid">
          <div>
            <div className="eyebrow">{video.testament} - {video.book}</div>
            <h1 className="serif" style={{ fontWeight: 400, marginTop: 16 }}>{video.title}</h1>
            <p style={{ marginTop: 24, color: "var(--ink)", fontSize: 19, lineHeight: 1.5, maxWidth: 640, fontFamily: "var(--serif)", fontStyle: "italic" }}>
              {video.summary}
            </p>
            <div className="tag-list" style={{ marginTop: 28, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {video.themes.map((t) => <span key={t} className="chip">{t}</span>)}
            </div>

            <div className="chapters-section" style={{ marginTop: 56 }}>
              <h3 className="serif" style={{ fontWeight: 500, marginBottom: 20 }}>Chapters</h3>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {video.chapters.map((c, i) =>
                <li key={i} style={{ display: "flex", gap: 24, padding: "14px 0", borderBottom: "1px solid var(--line-soft)" }}>
                    <div className="mono" style={{ color: "var(--gold)", fontSize: 13, width: 60, flexShrink: 0 }}>{c.t}</div>
                    <div className="serif" style={{ fontSize: 18 }}>{c.title}</div>
                  </li>
                )}
              </ol>
            </div>
          </div>

          {/* Side */}
          <aside style={{ position: "sticky", top: 100, alignSelf: "start" }}>
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow">Details</div>
              <dl style={{ marginTop: 16, display: "grid", gap: 12, fontSize: 14 }}>
                <Row k="Passage" v={video.passage} />
                <Row k="Runtime" v={video.runtime} />
                <Row k="Released" v={video.year} />
                <Row k="Testament" v={video.testament} />
              </dl>
              <div style={{ height: 1, background: "var(--line-soft)", margin: "20px 0" }} />
              <button className="btn btn-ghost" style={{ width: "100%", justifyContent: "center" }}>
                <Icon.download /> Reading guide (PDF)
              </button>
            </div>

            {relatedAlbum &&
            <a href={`#/music/albums/${relatedAlbum.slug}`} className="lift card item-shadow" style={{ display: "block", marginTop: 20, padding: 16, textDecoration: "none" }}>
                <div className="eyebrow">Sister album</div>
                <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center" }}>
                  <div style={{ width: 70, flexShrink: 0 }}>
                    <CoverArt hue={relatedAlbum.coverHue} label="" small />
                  </div>
                  <div>
                    <div className="serif" style={{ fontSize: 18 }}>{relatedAlbum.title}</div>
                    <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-soft)", marginTop: 2 }}>
                      {relatedAlbum.tracks.length} TRACKS - {relatedAlbum.year}
                    </div>
                  </div>
                </div>
              </a>
            }
          </aside>
        </div>
      </div>

      <style>{`
        .video-detail-grid { display: grid; grid-template-columns: 1.6fr 0.9fr; gap: 64px; }
        @media (max-width: 880px) {
          .video-detail-grid { grid-template-columns: 1fr; gap: 32px; }
        }
      `}</style>
    </div>);

}
function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
      <dt className="mono" style={{ color: "var(--ink-soft)", fontSize: 10, letterSpacing: "0.18em", textTransform: "uppercase" }}>{k}</dt>
      <dd style={{ margin: 0, color: "var(--ink)", textAlign: "right" }}>{v}</dd>
    </div>);

}

function NotFound({ to = "#/", label = "Back home" }) {
  return (
    <div className="container" style={{ padding: "120px 0", textAlign: "center" }}>
      <div className="eyebrow">404 - Lost in the wilderness</div>
      <h1 className="serif" style={{ fontWeight: 400, marginTop: 18, fontSize: 64 }}>
        Not in this scroll.
      </h1>
      <p style={{ color: "var(--ink-dim)", marginTop: 16, fontSize: 17 }}>
        "Seek, and ye shall find." - Mt. 7:7
      </p>
      <div style={{ marginTop: 32 }}>
        <a href={to} className="btn">{label}</a>
      </div>
    </div>);

}

Object.assign(window, {
  HomePage,
  BibleInVideoPage,
  VideoDetailPage,
  NotFound,
  AlbumCard,
  VideoCard,
  SectionHeader,
  Row
});
