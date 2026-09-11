/* global React, EGH_DATA */
const { useState: useStateM, useMemo: useMemoM, useEffect: useEffectM } = React;

// ============================================================
// MUSIC LANDING
// ============================================================
function MusicPage({ play }) {
  const featured = EGH_DATA.albums[0];
  return (
    <div>
      <section style={{ position: "relative", padding: "56px 0 48px", borderBottom: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 80% 30%, oklch(0.22 0.08 ${featured.coverHue}), transparent 60%)`,
          pointerEvents: "none",
        }} />
        <div className="container music-hero-content" style={{ position: "relative" }}>
          <div className="eyebrow">Eternal Grace Music</div>
          <h1 className="serif" style={{ marginTop: 16, fontWeight: 400, maxWidth: 880 }}>
            Albums & Singles
          </h1>
          <p style={{ marginTop: 22, color: "var(--ink-dim)", fontSize: 19, maxWidth: 640 }}>
            Here you will find our album and single releases. They were all written to be listened to in order, like a Psalm written to be prayed from top to bottom.
          </p>
          <div className="music-hero-actions" style={{ marginTop: 36, display: "flex", gap: 14, flexWrap: "wrap" }}>
            <a href="#/resources" className="btn btn-solid">Browse all albums <Icon.arrow /></a>
            <a href="#/resources" className="btn btn-ghost">Worship leader resources</a>
          </div>
        </div>
      </section>

      {/* Featured */}
      <section style={{ padding: "56px 0" }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 20 }}>Featured · The newest record</div>
          <div className="featured-album">
            <a href={`#/music/albums/${featured.slug}`} className="lift item-shadow" style={{ display: "block" }}>
              <CoverArt hue={featured.coverHue} label={featured.coverLabel} />
            </a>
            <div>
              <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--gold)" }}>
                LP · {featured.year} · {featured.runtime}
              </div>
              <h2 className="serif" style={{ marginTop: 14, fontWeight: 400 }}>{featured.title}</h2>
              <p style={{ marginTop: 14, color: "var(--ink-dim)", fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 18 }}>
                {featured.scripture} · {featured.theme}
              </p>
              <p style={{ marginTop: 24, color: "var(--ink)", fontSize: 17, lineHeight: 1.6, maxWidth: 540 }}>
                {featured.description}
              </p>
              <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <a href={`#/music/albums/${featured.slug}`} className="btn">Play the record <Icon.arrow /></a>
                <button className="btn btn-ghost"><Icon.download /> Chord book</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 72px" }}>
        <div className="container">
          <SectionHeader eyebrow="The Catalog" title="Every record we've made." link={["#/resources", "Library →"]} />
          <div className="album-strip">
            {EGH_DATA.albums.map((a) => <AlbumCard key={a.slug} album={a} />)}
          </div>
        </div>
      </section>

      <style>{`
        .featured-album { display: grid; grid-template-columns: 0.9fr 1.1fr; gap: 64px; align-items: center; }
        .album-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
        @media (max-width: 880px) {
          .featured-album { grid-template-columns: 1fr; gap: 32px; }
          .album-strip { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

// ============================================================
// ALBUM LIBRARY
// ============================================================
function AlbumLibraryPage() {
  const [q, setQ] = useStateM("");
  const [sort, setSort] = useStateM("newest");
  const albums = EGH_DATA.albums;
  const filtered = useMemoM(() => {
    let list = albums.filter((a) => {
      if (!q) return true;
      const hay = `${a.title} ${a.scripture} ${a.theme} ${a.description}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    });
    if (sort === "newest") list = [...list].sort((a, b) => b.year - a.year);
    if (sort === "oldest") list = [...list].sort((a, b) => a.year - b.year);
    if (sort === "az") list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [q, sort]);

  return (
    <div>
      <PageHeader
        eyebrow="Music · Album Library"
        title="Every record, every track."
        sub="Search by title, scripture, theme. Open any album for the full tracklist with lyrics, chords, and downloads."
      >
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 420 }}>
            <Icon.search style={{ position: "absolute", left: 14, top: 14, color: "var(--ink-soft)" }} />
            <input
              className="search-input"
              placeholder="Search albums, scriptures, themes…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["newest", "Newest"], ["oldest", "Oldest"], ["az", "A–Z"]].map(([v, l]) => (
              <button key={v} onClick={() => setSort(v)} className={`chip ${sort === v ? "active" : ""}`}>{l}</button>
            ))}
          </div>
          <div className="mono" style={{ marginLeft: "auto", fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>
            {filtered.length}/{albums.length} ALBUMS
          </div>
        </div>
      </PageHeader>

      <div className="container">
        {filtered.length === 0 ? (
          <EmptyState title="No records in this groove." sub="Try clearing your search." />
        ) : (
          <div className="album-strip">
            {filtered.map((a) => <AlbumCard key={a.slug} album={a} />)}
          </div>
        )}
      </div>
      <style>{`
        .album-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
        @media (max-width: 880px) { .album-strip { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

// ============================================================
// ALBUM DETAIL — with layout tweak
// ============================================================
function AlbumDetailPage({ slug, layout, play, playState }) {
  const album = EGH_DATA.albums.find((a) => a.slug === slug);
  const [openTrack, setOpenTrack] = useStateM(null);
  const [albumPlaying, setAlbumPlaying] = useStateM(false);
  if (!album) return <NotFound to="#/resources" label="Back to Worship" />;

  const layoutToUse = layout || "vinyl";

  return (
    <div>
      {layoutToUse === "vinyl" && (
        <AlbumLayoutVinyl
          album={album}
          openTrack={openTrack}
          setOpenTrack={setOpenTrack}
          play={play}
          playState={playState}
          albumPlaying={albumPlaying}
          setAlbumPlaying={setAlbumPlaying}
        />
      )}
      {layoutToUse === "editorial" && (
        <AlbumLayoutEditorial
          album={album}
          openTrack={openTrack}
          setOpenTrack={setOpenTrack}
          play={play}
          playState={playState}
        />
      )}
      {layoutToUse === "leader" && (
        <AlbumLayoutLeader
          album={album}
          play={play}
          playState={playState}
        />
      )}
    </div>
  );
}

// Shared track row interactions
function TrackRowLegacy({ track, album, isOpen, onToggle, play, isPlaying }) {
  return (
    <div style={{ borderBottom: "1px solid var(--line-soft)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 36px 1fr auto 60px 90px", gap: 16, alignItems: "center", padding: "16px 0" }} className="track-row-inner">
        <div className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>
          {String(track.n).padStart(2, "0")}
        </div>
        <button
          onClick={() => play(album, track)}
          aria-label="Play track"
          style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "1px solid var(--gold)",
            display: "grid", placeItems: "center",
            color: isPlaying ? "var(--on-gold)" : "var(--gold-bright)",
            background: isPlaying ? "var(--gold)" : "transparent",
          }}
        >
          {isPlaying ? <Icon.pause /> : <Icon.play />}
        </button>
        <button onClick={onToggle} style={{ textAlign: "left" }}>
          <div className="serif" style={{ fontSize: 19, color: "var(--ink)" }}>{track.title}</div>
        </button>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.14em" }}>KEY OF {track.key}</div>
        <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", textAlign: "right" }}>{track.time}</div>
        <button onClick={onToggle} className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.14em", textAlign: "right", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
          {isOpen ? "HIDE" : "LYRICS"} <Icon.chevron style={{ transform: isOpen ? "rotate(180deg)" : "none" }} />
        </button>
      </div>
      {isOpen && (
        <div style={{ padding: "8px 0 28px 56px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="track-detail">
          <div>
            <div className="kicker">Lyrics</div>
            <pre className="serif" style={{ marginTop: 12, fontSize: 17, lineHeight: 1.7, whiteSpace: "pre-wrap", color: "var(--ink)", fontFamily: "var(--serif)", fontStyle: "italic" }}>
{track.lyric}
            </pre>
          </div>
          <div>
            <div className="kicker">Chords · Key of {track.key}</div>
            <div className="mono" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.9, color: "var(--gold-bright)" }}>
              {generateChordSketch(track.key)}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 18 }}>
              <Icon.download /> Chord sheet (PDF)
            </button>
          </div>
        </div>
      )}
      <style>{`
        @media (max-width: 720px) {
          .track-row-inner { grid-template-columns: 28px 28px 1fr 60px !important; }
          .track-row-inner > :nth-child(4), .track-row-inner > :nth-child(6) { display: none; }
          .track-detail { grid-template-columns: 1fr !important; padding-left: 0 !important; }
        }
      `}</style>
    </div>
  );
}

function TrackRow({ track }) {
  return (
    <div style={{ borderBottom: "1px solid var(--line-soft)" }}>
      <div className="track-row-inner track-row-simple">
        <div className="mono track-row-number">
          {String(track.n).padStart(2, "0")}
        </div>
        <div className="serif track-row-title">{track.title}</div>
      </div>
      <style>{`
        .track-row-simple {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr);
          gap: 12px;
          align-items: center;
          padding: 9px 0;
        }
        .track-row-number {
          color: var(--ink-soft);
          font-size: 11px;
        }
        .track-row-title {
          color: var(--ink);
          font-size: 17px;
          line-height: 1.25;
        }
        @media (max-width: 720px) {
          .track-row-simple {
            grid-template-columns: 28px minmax(0, 1fr);
            gap: 10px;
            padding: 8px 0;
          }
          .track-row-title {
            font-size: 16px;
          }
        }
      `}</style>
    </div>
  );
}

function AlbumVideoPanel({ album }) {
  return (
    <section className="album-video-panel">
      <div className="album-video-frame">
        <CoverArt hue={album.coverHue} label={album.coverLabel} small />
        <div className="album-video-overlay">
          <div className="album-video-play"><Icon.play /></div>
        </div>
      </div>
      <style>{`
        .album-video-panel {
          margin-top: 46px;
        }
        .album-video-frame {
          position: relative;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          border: 1px solid var(--line);
          background: var(--bg-deep);
          box-shadow:
            0 28px 70px -34px rgba(6, 13, 24, 0.78),
            0 14px 34px -22px rgba(138, 106, 34, 0.42),
            0 1px 0 rgba(255,255,255,0.82) inset;
          max-height: 360px;
        }
        .album-video-frame .cover {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        .album-video-frame .cover-label {
          font-size: clamp(20px, 4vw, 42px) !important;
        }
        .album-video-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(18px, 2.5vw, 28px);
          color: white;
          background: linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.18));
        }
        .album-video-play {
          width: clamp(48px, 5vw, 58px);
          height: clamp(48px, 5vw, 58px);
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--gold);
          color: var(--on-gold);
          flex: 0 0 auto;
        }
      `}</style>
    </section>
  );
}

function generateChordSketch(key) {
  const sketches = {
    D: "[ D ]    [ A ]    [ Bm ]   [ G ]\n[ G ]    [ D ]    [ A ]    [ D ]",
    G: "[ G ]    [ D ]    [ Em ]   [ C ]\n[ C ]    [ G ]    [ D ]    [ G ]",
    A: "[ A ]    [ E ]    [ F#m ]  [ D ]\n[ D ]    [ A ]    [ E ]    [ A ]",
    Em: "[ Em ]   [ C ]    [ G ]    [ D ]\n[ Am ]   [ Em ]   [ B7 ]   [ Em ]",
    Bm: "[ Bm ]   [ G ]    [ D ]    [ A ]\n[ G ]    [ Bm ]   [ A ]    [ Bm ]",
    C: "[ C ]    [ G ]    [ Am ]   [ F ]\n[ F ]    [ C ]    [ G ]    [ C ]",
    F: "[ F ]    [ C ]    [ Dm ]   [ Bb ]\n[ Bb ]   [ F ]    [ C ]    [ F ]",
    Am: "[ Am ]   [ F ]    [ C ]    [ G ]\n[ F ]    [ Am ]   [ E7 ]   [ Am ]",
    Dm: "[ Dm ]   [ Bb ]   [ F ]    [ C ]\n[ Bb ]   [ Dm ]   [ A7 ]   [ Dm ]",
  };
  return sketches[key] || sketches.D;
}

// ─── Layout A: Vinyl (default) ───────────────────────────────
function AlbumLayoutVinylLegacy({ album, openTrack, setOpenTrack, play, playState, albumPlaying, setAlbumPlaying }) {
  return (
    <div>
      <div style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ padding: "32px 0" }}>
          <a href="#/resources" className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>Back to Worship</a>
        </div>
      </div>

        <div className="container album-detail-section" style={{ padding: "28px 0 56px" }}>
        <div className="album-vinyl-grid">
          {/* Sticky cover side */}
          <aside style={{ position: "sticky", top: 100, alignSelf: "start" }}>
            <div>
              <button
                onClick={() => { setAlbumPlaying((p) => !p); play(album, album.tracks[0]); }}
                className="btn btn-solid"
                style={{ width: "100%", justifyContent: "center" }}
              >
                {albumPlaying ? <Icon.pause /> : <Icon.play />} {albumPlaying ? "Pause album" : "Play album"}
              </button>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>
                  <Icon.download /> Album chord book (PDF)
                </button>
                <button className="btn btn-ghost btn-sm" style={{ justifyContent: "center" }}>
                  <Icon.download /> Album lyrics (PDF)
                </button>
              </div>
              <div style={{ marginTop: 24, padding: 18, border: "1px solid var(--line)" }}>
                <div className="eyebrow">Album details</div>
                <dl style={{ marginTop: 14, display: "grid", gap: 10, fontSize: 14 }}>
                  <Row k="Artist" v={album.artist} />
                  <Row k="Released" v={album.year} />
                  <Row k="Tracks" v={album.tracks.length} />
                  <Row k="Runtime" v={album.runtime} />
                  <Row k="Scripture" v={album.scripture} />
                </dl>
              </div>
            </div>
          </aside>

          <div>
            <div className="eyebrow">Eternal Grace Music · {album.year}</div>
            <h1 className="serif" style={{ marginTop: 14, fontWeight: 400 }}>{album.title}</h1>
            <p style={{ marginTop: 18, color: "var(--ink-dim)", fontStyle: "italic", fontFamily: "var(--serif)", fontSize: 20 }}>
              {album.theme}
            </p>
            <p style={{ marginTop: 24, color: "var(--ink)", fontSize: 17, lineHeight: 1.65, maxWidth: 640 }}>
              {album.description}
            </p>

            <AlbumVideoPanel album={album} />

          </div>
        </div>
        <RelatedSection album={album} />
      </div>

      <style>{`
        .album-vinyl-grid { display: grid; grid-template-columns: 0.85fr 1.4fr; gap: 64px; }
        @media (max-width: 920px) {
          .album-vinyl-grid { grid-template-columns: 1fr; gap: 32px; }
          .album-vinyl-grid > aside { position: static !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Layout B: Editorial (full-bleed) ────────────────────────
function AlbumLayoutVinylProductLegacy({ album, openTrack, setOpenTrack, play, playState, albumPlaying, setAlbumPlaying }) {
  return (
    <div>
      <div style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ padding: "28px 0" }}>
          <a href="#/resources" className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>Back to Worship</a>
        </div>
      </div>

      <div className="container album-detail-section album-detail-modern">
        <div className="album-modern-grid">
          <section className="album-summary-panel">
            <div className="eyebrow">Eternal Grace Music - {album.year}</div>
            <h1 className="serif">{album.title}</h1>
            <p className="album-theme">{album.theme}</p>
            <p className="album-description">{album.description}</p>

            <div className="album-action-row">
              <button className="btn btn-ghost btn-sm">
                <Icon.download /> Chord book
              </button>
              <button className="btn btn-ghost btn-sm">
                <Icon.download /> Lyrics PDF
              </button>
            </div>
          </section>

          <AlbumVideoPanel album={album} />
        </div>
        <RelatedSection album={album} />
      </div>

      <style>{`
        .album-detail-modern {
          padding: 48px 0 56px;
        }
        .album-modern-grid {
          display: grid;
          grid-template-columns: minmax(360px, 0.9fr) minmax(420px, 1fr);
          gap: clamp(34px, 5vw, 64px);
          align-items: center;
        }
        .album-summary-panel {
          max-width: 560px;
        }
        .album-summary-panel h1 {
          margin: 18px 0 0;
          font-size: clamp(46px, 5vw, 68px);
          line-height: 1;
          font-weight: 400;
        }
        .album-theme {
          margin-top: 18px;
          color: var(--ink-dim);
          font-family: var(--serif);
          font-style: italic;
          font-size: 19px;
          line-height: 1.4;
        }
        .album-description {
          margin-top: 20px;
          color: var(--ink);
          font-size: 16px;
          line-height: 1.68;
          max-width: 520px;
        }
        .album-action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 28px;
          max-width: 520px;
        }
        .album-action-row .btn {
          min-height: 42px;
          padding: 0 14px;
          font-size: 10px;
          letter-spacing: 0.1em;
        }
        .album-action-row .btn-solid {
          min-width: 136px;
        }
        .album-action-row .btn-sm {
          min-width: 116px;
        }
        .album-detail-modern .album-video-panel {
          margin-top: 0;
          width: 100%;
        }
        @media (max-width: 980px) {
          .album-modern-grid {
            grid-template-columns: 1fr;
            gap: 34px;
            align-items: start;
          }
          .album-summary-panel h1 {
            font-size: clamp(42px, 10vw, 62px);
          }
          .album-summary-panel {
            max-width: 720px;
          }
        }
        @media (max-width: 620px) {
          .album-detail-modern {
            padding-top: 32px;
          }
          .album-action-row .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}

function AlbumLayoutVinyl({ album, openTrack, setOpenTrack, play, playState }) {
  const formats = [
    {
      id: "chords",
      title: "Chord Book PDF",
      price: 9,
      blurb: "Lead sheets, keys, and print-ready charts.",
    },
    {
      id: "mp3",
      title: "MP3 Audio Files",
      price: 12,
      blurb: "Full album download for personal listening.",
    },
    {
      id: "lyrics",
      title: "Lyrics PDF",
      price: 5,
      blurb: "Readable lyrics for rehearsal and projection.",
    },
  ];
  const [selectedFormats, setSelectedFormats] = useStateM(["mp3"]);
  const [selectedTrackProducts, setSelectedTrackProducts] = useStateM([]);
  const [cartState, setCartState] = useStateM("");
  const [donation, setDonation] = useStateM("");
  const selectedItems = formats.filter((format) => selectedFormats.includes(format.id));
  const trackProductOptions = [
    { id: "mp3", label: "MP3", price: 2 },
    { id: "chord", label: "Chords", price: 2 },
  ];
  const getTrackProductKey = (trackN, type) => `${trackN}:${type}`;
  const selectedTrackItems = selectedTrackProducts.map((key) => {
    const [trackN, type] = key.split(":");
    const track = album.tracks.find((item) => item.n === Number(trackN));
    const option = trackProductOptions.find((item) => item.id === type);
    return track && option ? { key, track, option } : null;
  }).filter(Boolean);
  const donationAmount = Math.max(0, Number.parseFloat(donation) || 0);
  const subtotal = selectedItems.reduce((sum, format) => sum + format.price, 0);
  const trackSubtotal = selectedTrackItems.reduce((sum, item) => sum + item.option.price, 0);
  const total = subtotal + trackSubtotal + donationAmount;
  const toggleFormat = (id) => {
    setCartState("");
    setSelectedFormats((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  };
  const toggleTrackProduct = (trackN, type) => {
    const key = getTrackProductKey(trackN, type);
    setCartState("");
    setSelectedTrackProducts((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key]);
  };
  const confirmCart = (label) => {
    if (!selectedItems.length && !selectedTrackItems.length && !donationAmount) {
      setCartState("Choose a format, a track, or a donation amount first.");
      return;
    }
    const cartItems = [
      ...selectedItems.map((item) => ({
        id: `album-${album.slug}-${item.id}`,
        type: "Album format",
        title: `${album.title} - ${item.title}`,
        subtitle: item.blurb,
        price: item.price,
        qty: 1,
      })),
      ...selectedTrackItems.map((item) => ({
        id: `track-${album.slug}-${item.track.n}-${item.option.id}`,
        type: "Track",
        title: `${item.track.title} - ${item.option.label}`,
        subtitle: album.title,
        price: item.option.price,
        qty: 1,
      })),
    ];
    if (donationAmount) {
      cartItems.push({
        id: `donation-${album.slug}-${Date.now()}`,
        type: "Donation",
        title: "Optional donation",
        subtitle: "A portion of proceeds goes to help those in need.",
        price: donationAmount,
        qty: 1,
      });
    }
    if (window.EGH_ADD_TO_CART) window.EGH_ADD_TO_CART(cartItems);
    const itemCount = selectedItems.length + selectedTrackItems.length;
    setCartState(`${cartItems.length || 1} item${cartItems.length === 1 ? "" : "s"} ${label}. View cart from the top menu.`);
  };

  return (
    <div>
      <div className="album-product-breadcrumb">
        <div className="container">
          <a href="#/resources" className="mono">Back to Worship</a>
        </div>
      </div>

      <div className="container album-product-page">
        <div className="album-product-grid">
          <div className="album-product-media">
            <AlbumVideoPanel album={album} />
            <div className="album-media-heading">
              <h1 className="serif">{album.title}</h1>
            </div>
            <p className="album-media-description">{album.description}</p>
            <div className="album-format-heading">
              <h2>Choose your formats</h2>
              <p>Add one or more digital variations to your cart.</p>
            </div>
            <div className="album-format-list">
              {formats.map((format) => {
                const active = selectedFormats.includes(format.id);
                return (
                  <button
                    key={format.id}
                    type="button"
                    className={`album-format-option ${active ? "active" : ""}`}
                    onClick={() => toggleFormat(format.id)}
                    aria-pressed={active}
                  >
                    <span className="album-format-top">
                      <span className="album-format-check" aria-hidden="true">{active ? "✓" : ""}</span>
                      <b>${format.price}</b>
                    </span>
                    <span className="album-format-body">
                      <strong>{format.title}</strong>
                      <small>{format.blurb}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="album-buy-panel">
            <div className="album-buy-price">${total}</div>
            <div className="album-buy-delivery">Digital delivery after checkout</div>
            {(selectedItems.length > 0 || selectedTrackItems.length > 0) && (
              <div className="album-buy-summary">
                {selectedItems.map((item) => (
                  <div key={item.id}><span>{item.title}</span><strong>${item.price}</strong></div>
                ))}
                {selectedTrackItems.map((item) => (
                  <div key={item.key}><span>{item.track.title} - {item.option.label}</span><strong>${item.option.price}</strong></div>
                ))}
              </div>
            )}
            <div className="album-buy-availability">Available now</div>
            <label className="album-donation-field">
              <span>Optional donation</span>
              <div>
                <b>$</b>
                <input
                  type="number"
                  min="0"
                  step="1"
                  inputMode="decimal"
                  placeholder="Any amount"
                  value={donation}
                  onChange={(e) => setDonation(e.target.value)}
                  aria-label="Optional donation amount" />
              </div>
            </label>
            <button type="button" className="btn btn-solid" onClick={() => confirmCart("added to cart")}>
              Add to cart
            </button>
            <div className="album-mercy-note">
              <p>A portion of proceeds goes to help those in need.</p>
              <q>His mercy endureth for ever.</q>
              <span>Psalm 136:1</span>
            </div>
            <div className="album-buy-facts">
              <div><span>Payment</span><strong>Secure transaction</strong></div>
            </div>
            {cartState && <div className="album-cart-status">{cartState}</div>}
          </aside>
        </div>

        <div className="album-track-purchase">
          <div>
            <h2>Or choose individual tracks</h2>
            <p>Preview each song, then add the MP3 or chords for only the tracks you need.</p>
          </div>
          <div className="album-track-purchase-grid">
            {album.tracks.map((track) => {
              const isPlaying = playState && playState.album === album.slug && playState.trackN === track.n && playState.playing;
              return (
                <div
                  key={track.n}
                  className="album-track-option"
                >
                  <button
                    type="button"
                    className="album-track-preview"
                    onClick={() => play(album, track, { preview: true })}
                    aria-label={`Preview ${track.title} for 15 seconds`}
                  >
                    {isPlaying ? <Icon.pause /> : <Icon.play />}
                  </button>
                  <div className="album-track-info">
                    <span className="mono">{String(track.n).padStart(2, "0")} - {track.time}</span>
                    <strong>{track.title}</strong>
                  </div>
                  <div className="album-track-actions">
                    {trackProductOptions.map((option) => {
                      const active = selectedTrackProducts.includes(getTrackProductKey(track.n, option.id));
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={`album-track-add ${active ? "active" : ""}`}
                          onClick={() => toggleTrackProduct(track.n, option.id)}
                          aria-pressed={active}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <RelatedSection album={album} />
      </div>

      <style>{`
        .album-product-breadcrumb {
          border-bottom: 1px solid var(--line);
          background: var(--bg-soft);
        }
        .album-product-breadcrumb .container {
          padding: 13px 0;
        }
        .album-product-breadcrumb a {
          color: var(--ink-soft);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        .album-product-page {
          padding: 34px 0 56px;
        }
        .album-product-grid {
          display: grid;
          grid-template-columns: minmax(560px, 1fr) 260px;
          gap: clamp(30px, 4vw, 52px);
          align-items: start;
        }
        .album-product-media {
          position: sticky;
          top: 92px;
        }
        .album-product-media .album-video-panel {
          margin-top: 0;
        }
        .album-product-media .album-video-frame {
          max-height: none;
        }
        .album-media-heading h1 {
          margin: 14px 0 0;
          font-size: clamp(30px, 3.1vw, 42px);
          line-height: 1;
          font-weight: 400;
        }
        .album-media-heading {
          margin-top: 22px;
        }
        .album-media-description {
          margin: 12px 0 0;
          color: var(--ink);
          font-size: 16px;
          line-height: 1.66;
          max-width: 760px;
        }
        .album-format-heading {
          margin-top: 28px;
        }
        .album-format-heading h2 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .album-format-heading p {
          margin: 7px 0 0;
          color: var(--ink-dim);
          font-size: 14px;
        }
        .album-format-list {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 18px;
        }
        .album-format-option {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
          min-height: 132px;
          align-items: start;
          justify-content: space-between;
          padding: 16px;
          border: 1px solid color-mix(in oklab, var(--line) 78%, var(--gold));
          border-radius: 8px;
          background:
            linear-gradient(145deg, color-mix(in oklab, var(--bg-elev) 95%, white), color-mix(in oklab, var(--bg-soft) 92%, var(--gold)));
          box-shadow: 0 14px 30px rgba(8, 16, 28, 0.07);
          text-align: left;
          transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
        }
        .album-format-option.active {
          border-color: var(--gold);
          background:
            linear-gradient(145deg, color-mix(in oklab, var(--gold) 18%, var(--bg-elev)), color-mix(in oklab, var(--bg-elev) 92%, var(--gold)));
          box-shadow: 0 18px 40px rgba(156, 115, 30, 0.18);
        }
        .album-format-option:hover {
          transform: translateY(-2px);
          border-color: var(--gold);
        }
        .album-format-top {
          display: flex;
          width: 100%;
          align-items: start;
          justify-content: space-between;
          gap: 10px;
        }
        .album-format-check {
          width: 22px;
          height: 22px;
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--on-gold);
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .album-format-option.active .album-format-check {
          border-color: var(--gold);
          background: var(--gold);
        }
        .album-format-body {
          display: block;
        }
        .album-format-option strong,
        .album-format-option small {
          display: block;
        }
        .album-format-option strong {
          min-height: 0;
          color: var(--ink);
          font-size: 16px;
          line-height: 1.25;
        }
        .album-format-option small {
          margin-top: 8px;
          color: var(--ink-dim);
          font-size: 12px;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .album-format-option b {
          color: var(--ink);
          font-size: 18px;
          line-height: 1;
        }
        .album-track-purchase {
          margin-top: 28px;
          padding-top: 24px;
          border-top: 1px solid var(--line);
        }
        .album-track-purchase h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }
        .album-track-purchase p {
          margin: 7px 0 0;
          color: var(--ink-dim);
          font-size: 14px;
        }
        .album-track-purchase-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 12px;
          margin-top: 16px;
        }
        .album-track-option {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 124px;
          gap: 10px;
          align-items: center;
          min-height: 56px;
          padding: 10px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: var(--bg-elev);
          text-align: left;
        }
        .album-track-preview {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--gold);
          color: var(--gold);
          background: color-mix(in oklab, var(--gold) 8%, transparent);
        }
        .album-track-preview:hover {
          background: var(--gold);
          color: var(--on-gold);
        }
        .album-track-info {
          min-width: 0;
        }
        .album-track-info .mono {
          display: block;
          margin-bottom: 2px;
          color: var(--ink-soft);
          font-size: 10px;
          letter-spacing: 0.08em;
        }
        .album-track-info strong {
          display: block;
          min-width: 0;
          overflow: visible;
          text-overflow: clip;
          white-space: normal;
          font-size: 14px;
          line-height: 1.25;
        }
        .album-track-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 6px;
        }
        .album-track-add {
          display: flex;
          min-height: 34px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 9px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          color: var(--ink);
          font-size: 12px;
          font-weight: 700;
          background: color-mix(in oklab, var(--bg-elev) 96%, white);
        }
        .album-track-add.active {
          border-color: var(--gold);
          background: var(--gold);
          color: var(--on-gold);
        }
        .album-buy-panel {
          position: sticky;
          top: 92px;
          padding: 18px;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: color-mix(in oklab, var(--bg-elev) 92%, transparent);
        }
        .album-buy-price {
          margin-top: 0;
          font-size: 34px;
          line-height: 1;
          font-weight: 600;
        }
        .album-buy-delivery {
          margin-top: 18px;
          color: var(--ink-dim);
          font-size: 13px;
          line-height: 1.45;
        }
        .album-buy-summary {
          display: grid;
          gap: 7px;
          margin-top: 14px;
          padding: 12px 0;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          font-size: 12px;
        }
        .album-buy-summary > div {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .album-buy-summary span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .album-buy-availability {
          margin-top: 18px;
          color: #087a31;
          font-size: 18px;
          line-height: 1.25;
        }
        .album-donation-field {
          display: block;
          margin-top: 14px;
        }
        .album-donation-field span {
          display: block;
          margin-bottom: 7px;
          font-size: 13px;
        }
        .album-donation-field div {
          display: flex;
          align-items: center;
          width: 100%;
          height: 36px;
          border: 1px solid var(--line-strong);
          border-radius: 8px;
          background: var(--bg-elev);
          color: var(--ink);
        }
        .album-donation-field b {
          padding-left: 12px;
          font-size: 14px;
        }
        .album-donation-field input {
          width: 100%;
          height: 100%;
          min-width: 0;
          padding: 0 12px 0 6px;
          border: 0;
          outline: none;
          background: transparent;
          color: var(--ink);
        }
        .album-buy-panel .btn {
          width: 100%;
          margin-top: 12px;
          justify-content: center;
        }
        .album-buy-panel .btn-solid {
          min-height: 42px;
          border-radius: 999px;
          border-color: #ffd014;
          background: #ffd014;
          color: #121212;
          text-transform: none;
          letter-spacing: 0;
          font-size: 14px;
        }
        .album-mercy-note {
          margin-top: 14px;
          padding: 12px 0 2px;
          color: var(--ink-dim);
          font-size: 12px;
          line-height: 1.45;
        }
        .album-mercy-note p {
          margin: 0 0 8px;
          color: var(--ink);
        }
        .album-mercy-note q {
          display: block;
          font-style: italic;
        }
        .album-mercy-note span {
          display: block;
          margin-top: 3px;
          color: var(--ink-soft);
          font-size: 11px;
        }
        .album-buy-facts {
          display: grid;
          gap: 12px;
          margin-top: 16px;
          padding: 0 4px 18px;
          border-bottom: 1px solid var(--line);
          font-size: 12px;
        }
        .album-buy-facts > div {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 8px;
        }
        .album-buy-facts span {
          color: var(--ink-dim);
        }
        .album-buy-facts strong {
          color: #195caa;
          font-weight: 500;
        }
        .album-cart-status {
          margin-top: 12px;
          padding: 10px;
          border: 1px solid var(--line);
          color: var(--ink);
          background: var(--bg-soft);
          font-size: 12px;
          line-height: 1.4;
        }
        @media (max-width: 980px) {
          .album-product-grid {
            grid-template-columns: minmax(320px, 1fr) 260px;
          }
          .album-buy-panel {
            position: sticky;
          }
        }
        @media (max-width: 820px) {
          .album-product-grid {
            grid-template-columns: 1fr;
          }
          .album-product-media {
            position: static;
          }
          .album-buy-panel {
            display: block;
            position: static;
          }
        }
        @media (max-width: 560px) {
          .album-product-page {
            padding-top: 24px;
          }
          .album-format-option {
            min-height: 116px;
          }
          .album-format-list,
          .album-track-purchase-grid {
            grid-template-columns: 1fr;
          }
          .album-track-option {
            grid-template-columns: 34px minmax(0, 1fr);
          }
          .album-track-actions {
            grid-column: 1 / -1;
          }
        }
      `}</style>
    </div>
  );
}

function AlbumLayoutEditorial({ album, openTrack, setOpenTrack, play, playState }) {
  return (
    <div>
      <section style={{ position: "relative", padding: "0 0 60px", borderBottom: "1px solid var(--line)", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0, zIndex: 0,
          background:
            `linear-gradient(180deg, transparent 0%, var(--bg) 95%),` +
            `radial-gradient(ellipse at 20% 30%, oklch(0.35 0.13 ${album.coverHue}), transparent 60%),` +
            `radial-gradient(ellipse at 75% 70%, oklch(0.18 0.08 ${(album.coverHue + 60) % 360}), transparent 60%)`,
        }} />
        <div className="container" style={{ position: "relative", paddingTop: 32 }}>
          <a href="#/resources" className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>Back to Worship</a>
        </div>
        <div className="container editorial-hero-copy" style={{ position: "relative", paddingTop: 80, paddingBottom: 60 }}>
          <div className="eyebrow">Eternal Grace Music · LP {album.year}</div>
          <h1 className="serif" style={{ marginTop: 18, fontWeight: 400, fontSize: "clamp(56px, 9vw, 128px)", lineHeight: 0.95, maxWidth: 1100 }}>
            {album.title}
          </h1>
          <p style={{ marginTop: 32, fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 22, color: "var(--ink-dim)" }}>
            {album.scripture} · {album.theme}
          </p>
        </div>
        <div className="container" style={{ position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "end" }} className="ed-hero-bot">
            <div style={{ maxWidth: 440 }}>
              <div className="item-shadow">
                <CoverArt hue={album.coverHue} label={album.coverLabel} />
              </div>
            </div>
            <div>
              <p style={{ color: "var(--ink)", fontSize: 18, lineHeight: 1.65, maxWidth: 540 }}>
                {album.description}
              </p>
              <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button onClick={() => play(album, album.tracks[0])} className="btn btn-solid">
                  <Icon.play /> Play album
                </button>
                <button className="btn btn-ghost"><Icon.download /> Chord book</button>
                <button className="btn btn-ghost"><Icon.download /> Lyrics PDF</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container" style={{ padding: "80px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 24 }}>
          <h2 className="serif" style={{ fontWeight: 400, fontSize: 36 }}>The record, in order.</h2>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", color: "var(--ink-soft)" }}>
            {album.tracks.length} TRACKS · {album.runtime}
          </div>
        </div>
        <div style={{ borderTop: "1px solid var(--line)" }}>
          {album.tracks.map((t) => (
            <TrackRow
              key={t.n}
              track={t}
              album={album}
              isOpen={openTrack === t.n}
              onToggle={() => setOpenTrack(openTrack === t.n ? null : t.n)}
              play={play}
              isPlaying={playState && playState.album === album.slug && playState.trackN === t.n && playState.playing}
            />
          ))}
        </div>
        <RelatedSection album={album} />
      </section>

      <style>{`
        @media (max-width: 880px) {
          .ed-hero-bot { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Layout C: Worship leader focused ────────────────────────
function AlbumLayoutLeader({ album, play, playState }) {
  const [tab, setTab] = useStateM("lyrics");
  const [activeTrack, setActiveTrack] = useStateM(album.tracks[0].n);
  const track = album.tracks.find((t) => t.n === activeTrack);
  return (
    <div>
      <div style={{ background: "var(--bg-deep)", borderBottom: "1px solid var(--line)" }}>
        <div className="container" style={{ padding: "24px 0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <a href="#/resources" className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>Back to Worship</a>
          <div className="mono" style={{ fontSize: 11, color: "var(--gold)", letterSpacing: "0.18em" }}>WORSHIP LEADER VIEW</div>
        </div>
      </div>

        <div className="container leader-section" style={{ padding: "40px 0" }}>
        <div className="leader-top">
          <div style={{ width: 140, flexShrink: 0 }}>
            <div className="item-shadow">
              <CoverArt hue={album.coverHue} label="" small />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <h1 className="serif leader-title" style={{ fontWeight: 400, fontSize: 56 }}>{album.title}</h1>
            <p style={{ marginTop: 8, color: "var(--ink-dim)", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 18 }}>{album.scripture} · {album.theme}</p>
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-solid btn-sm"><Icon.download /> Full chord book</button>
              <button className="btn btn-ghost btn-sm"><Icon.download /> Lyrics PDF</button>
              <button className="btn btn-ghost btn-sm"><Icon.download /> Multi-track stems</button>
            </div>
          </div>
        </div>

        <div className="leader-grid" style={{ marginTop: 56 }}>
          {/* Track sidebar */}
          <aside>
            <div className="eyebrow" style={{ marginBottom: 14 }}>Tracklist</div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, border: "1px solid var(--line)" }}>
              {album.tracks.map((t) => (
                <li key={t.n} style={{ borderBottom: "1px solid var(--line-soft)" }}>
                  <button
                    onClick={() => setActiveTrack(t.n)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "14px 16px",
                      display: "grid",
                      gridTemplateColumns: "26px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      background: activeTrack === t.n ? "var(--bg-elev)" : "transparent",
                      borderLeft: activeTrack === t.n ? "2px solid var(--gold)" : "2px solid transparent",
                    }}
                  >
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-soft)" }}>{String(t.n).padStart(2, "0")}</span>
                    <span className="serif" style={{ fontSize: 17, color: "var(--ink)" }}>{t.title}</span>
                    <span className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.12em" }}>{t.key}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-soft)", letterSpacing: "0.16em" }}>
                  TRACK {String(track.n).padStart(2, "0")} · KEY OF {track.key} · {track.time}
                </div>
                <h2 className="serif" style={{ marginTop: 6, fontWeight: 400, fontSize: 40 }}>{track.title}</h2>
              </div>
              <button onClick={() => play(album, track)} className="btn btn-solid btn-sm"><Icon.play /> Play</button>
            </div>

            <div style={{ borderBottom: "1px solid var(--line)", display: "flex", gap: 24 }}>
              {[["lyrics", "Lyrics"], ["chords", "Chords"], ["downloads", "Downloads"]].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setTab(v)}
                  style={{
                    padding: "12px 0",
                    fontSize: 13,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: tab === v ? "var(--gold-bright)" : "var(--ink-soft)",
                    borderBottom: tab === v ? "1px solid var(--gold)" : "1px solid transparent",
                  }}
                >
                  {l}
                </button>
              ))}
            </div>

            <div style={{ paddingTop: 32, minHeight: 320 }}>
              {tab === "lyrics" && (
                <pre className="serif" style={{ fontFamily: "var(--serif)", fontStyle: "italic", whiteSpace: "pre-wrap", fontSize: 22, lineHeight: 1.7, color: "var(--ink)" }}>
{track.lyric}
                </pre>
              )}
              {tab === "chords" && (
                <pre className="mono" style={{ fontSize: 16, color: "var(--gold-bright)", lineHeight: 2 }}>
{generateChordSketch(track.key)}
                </pre>
              )}
              {tab === "downloads" && (
                <div style={{ display: "grid", gap: 12 }}>
                  <DownloadRow label={`"${track.title}" — chord sheet (PDF)`} size="1 page · 64 KB" />
                  <DownloadRow label={`"${track.title}" — lyric sheet (PDF)`} size="1 page · 48 KB" />
                  <DownloadRow label={`"${track.title}" — lead sheet w/ melody (PDF)`} size="2 pages · 112 KB" />
                </div>
              )}
            </div>
          </div>
        </div>

        <RelatedSection album={album} />
      </div>

      <style>{`
        .leader-top { display: flex; gap: 32px; align-items: center; }
        .leader-grid { display: grid; grid-template-columns: 320px 1fr; gap: 48px; }
        @media (max-width: 880px) {
          .leader-top { flex-direction: column; align-items: flex-start; }
          .leader-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}

function DownloadRow({ label, size }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", border: "1px solid var(--line)" }}>
      <div>
        <div style={{ fontSize: 15 }}>{label}</div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-soft)", letterSpacing: "0.14em", marginTop: 3 }}>{size}</div>
      </div>
      <button className="btn btn-ghost btn-sm"><Icon.download /> Download</button>
    </div>
  );
}

function RelatedSectionLegacy({ album }) {
  const others = EGH_DATA.albums.filter((a) => a.slug !== album.slug);
  const video = EGH_DATA.videos.find((v) => v.relatedAlbum === album.slug);
  return (
    <div style={{ marginTop: 56, paddingTop: 36, borderTop: "1px solid var(--line)" }}>
      <SectionHeader eyebrow="Related" title="Companion pieces." />
      <div className="related-grid">
        {video && (
          <a href={`#/bibleinvideo/${video.slug}`} className="lift" style={{ display: "block" }}>
            <div className="item-shadow">
              <VideoStill hue={video.hue} label={`${video.book} · ${video.passage}`} />
            </div>
            <div className="eyebrow" style={{ marginTop: 14 }}>BibleInVideo</div>
            <div className="serif" style={{ fontSize: 22, marginTop: 6 }}>{video.title}</div>
          </a>
        )}
        {others.slice(0, video ? 2 : 3).map((a) => <AlbumCard key={a.slug} album={a} />)}
      </div>
      <style>{`
        .related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
        @media (max-width: 880px) { .related-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}

function RelatedSectionCarousel({ album }) {
  const others = EGH_DATA.albums.filter((a) => a.slug !== album.slug);
  const video = EGH_DATA.videos.find((v) => v.relatedAlbum === album.slug);
  const items = [
    ...(video ? [{
      type: "video",
      key: video.slug,
      href: `#/bibleinvideo/${video.slug}`,
      eyebrow: "BibleInVideo",
      title: video.title,
      meta: `${video.book} - ${video.passage} - ${video.runtime}`,
      summary: video.summary,
      hue: video.hue,
      label: `${video.book} - ${video.passage}`,
    }] : []),
    ...others.map((a) => ({
      type: "album",
      key: a.slug,
      href: `#/music/albums/${a.slug}`,
      eyebrow: "Eternal Grace Music",
      title: a.title,
      meta: `${a.tracks.length} tracks - ${a.runtime} - ${a.year}`,
      summary: a.description,
      hue: a.coverHue,
      label: a.coverLabel,
    })),
  ];
  const [index, setIndex] = useStateM(0);

  if (!items.length) return null;

  const active = items[index % items.length];
  const previous = () => setIndex((i) => (i - 1 + items.length) % items.length);
  const next = () => setIndex((i) => (i + 1) % items.length);

  return (
    <section className="related-section-wide">
      <div className="related-section-head">
        <div>
          <div className="eyebrow">Related</div>
          <h2 className="serif">Companion pieces.</h2>
        </div>
        <div className="mono related-page-count">{index + 1}/{items.length}</div>
      </div>
      <div className="related-carousel">
        <button type="button" className="related-arrow" onClick={previous} aria-label="Previous related item">
          <Icon.arrow style={{ transform: "rotate(180deg)" }} />
        </button>
        <a href={active.href} className="related-card lift">
          <div className="related-visual">
            {active.type === "video" ? (
              <VideoStill hue={active.hue} label={active.label} />
            ) : (
              <CoverArt hue={active.hue} label={active.label} />
            )}
          </div>
          <div className="related-copy">
            <div className="eyebrow">{active.eyebrow}</div>
            <h3 className="serif">{active.title}</h3>
            <p>{active.summary}</p>
            <div className="mono">{active.meta}</div>
          </div>
        </a>
        <button type="button" className="related-arrow" onClick={next} aria-label="Next related item">
          <Icon.arrow />
        </button>
      </div>
      <div className="related-dots" aria-label="Related item pagination">
        {items.map((item, i) => (
          <button
            key={item.key}
            type="button"
            className={`related-dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
            aria-label={`Show related item ${i + 1}`}
            aria-current={i === index ? "true" : undefined}
          />
        ))}
      </div>
      <style>{`
        .related-section-wide {
          margin-top: 64px;
          padding-top: 38px;
          border-top: 1px solid var(--line);
        }
        .related-section-head {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }
        .related-section-head h2 {
          margin: 10px 0 0;
          font-size: clamp(30px, 3vw, 42px);
          font-weight: 400;
        }
        .related-page-count {
          color: var(--ink-soft);
          font-size: 11px;
          letter-spacing: 0.16em;
        }
        .related-carousel {
          display: grid;
          grid-template-columns: 48px minmax(0, 1fr) 48px;
          gap: 16px;
          align-items: center;
        }
        .related-card {
          display: grid;
          grid-template-columns: minmax(260px, 0.9fr) minmax(280px, 1fr);
          gap: 34px;
          align-items: stretch;
          padding: 18px;
          border: 1px solid var(--line);
          background: color-mix(in oklab, var(--panel) 82%, transparent);
          min-height: 310px;
        }
        .related-visual {
          min-height: 270px;
          box-shadow: var(--shadow);
        }
        .related-visual > * {
          height: 100%;
        }
        .related-copy {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 18px 18px 18px 0;
        }
        .related-copy h3 {
          margin: 12px 0 0;
          font-size: clamp(30px, 4vw, 54px);
          line-height: 1;
          font-weight: 400;
        }
        .related-copy p {
          margin: 18px 0 20px;
          max-width: 560px;
          color: var(--ink-dim);
          line-height: 1.65;
          font-size: 16px;
        }
        .related-copy .mono {
          color: var(--ink-soft);
          font-size: 11px;
          letter-spacing: 0.16em;
        }
        .related-arrow {
          width: 48px;
          height: 48px;
          border: 1px solid var(--line);
          border-radius: 999px;
          background: var(--panel);
          color: var(--ink);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .related-arrow:hover {
          border-color: var(--gold);
          color: var(--gold);
        }
        .related-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
        }
        .related-dot {
          width: 9px;
          height: 9px;
          border: 1px solid var(--line-strong);
          border-radius: 999px;
          background: transparent;
          cursor: pointer;
        }
        .related-dot.active {
          width: 28px;
          background: var(--gold);
          border-color: var(--gold);
        }
        @media (max-width: 880px) {
          .related-carousel { grid-template-columns: 40px minmax(0, 1fr) 40px; gap: 8px; }
          .related-card { grid-template-columns: 1fr; gap: 20px; padding: 14px; min-height: 0; }
          .related-visual { min-height: 210px; }
          .related-copy { padding: 0 4px 8px; }
          .related-copy h3 { font-size: 30px; }
        }
        @media (max-width: 560px) {
          .related-section-head { align-items: start; }
          .related-carousel { grid-template-columns: 1fr; }
          .related-arrow { display: none; }
        }
      `}</style>
    </section>
  );
}

function RelatedSection({ album }) {
  const cleanText = (value) => String(value || "")
    .replaceAll("Â·", "-")
    .replaceAll("â€“", "-")
    .replaceAll("â€”", "-")
    .replaceAll("â€œ", "\"")
    .replaceAll("â€", "\"")
    .replaceAll("â€™", "'");
  const items = EGH_DATA.albums
    .filter((a) => a.slug !== album.slug)
    .map((a) => ({
      type: "album",
      key: a.slug,
      href: `#/music/albums/${a.slug}`,
      eyebrow: "Album",
      title: cleanText(a.title),
      meta: `${a.tracks.length} tracks - ${a.year}`,
      summary: cleanText(a.scripture),
      hue: a.coverHue,
      label: cleanText(a.coverLabel),
    }));

  if (!items.length) return null;

  return (
    <section className="related-section-wide related-section-compact">
      <div className="related-section-head">
        <div>
          <div className="eyebrow">Related</div>
          <h2 className="serif">Companion pieces.</h2>
        </div>
        <div className="mono related-page-count">{items.length} ITEMS</div>
      </div>
      <div className="related-compact-grid">
        {items.map((item) => (
          <a key={item.key} href={item.href} className="related-mini-card lift">
            <div className="related-mini-thumb">
            <CoverArt hue={item.hue} label={item.label} small />
            </div>
            <div className="related-mini-copy">
              <div className="eyebrow">{item.eyebrow}</div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <div className="mono">{item.meta}</div>
            </div>
          </a>
        ))}
      </div>
      <style>{`
        .related-section-compact {
          margin-top: 56px;
          padding-top: 34px;
          border-top: 1px solid var(--line);
        }
        .related-section-head {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          align-items: end;
          margin-bottom: 22px;
        }
        .related-section-head h2 {
          margin: 10px 0 0;
          font-size: clamp(28px, 3vw, 38px);
          font-weight: 400;
        }
        .related-page-count {
          color: var(--ink-soft);
          font-size: 11px;
          letter-spacing: 0.16em;
        }
        .related-compact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }
        .related-mini-card {
          display: grid;
          grid-template-columns: 112px minmax(0, 1fr);
          min-height: 150px;
          border: 1px solid var(--line);
          background: color-mix(in oklab, var(--panel) 86%, transparent);
          overflow: hidden;
        }
        .related-mini-thumb {
          min-height: 150px;
          background: var(--bg-soft);
        }
        .related-mini-thumb > * {
          width: 100%;
          height: 100%;
        }
        .related-mini-thumb .cover-label {
          left: 10px;
          right: 10px;
          bottom: 16px;
          width: auto;
          max-width: calc(100% - 20px);
          font-size: clamp(10px, 1.2vw, 15px) !important;
          line-height: 1.05;
          white-space: normal;
          overflow-wrap: break-word;
        }
        .related-mini-thumb .cover-mark,
        .related-mini-thumb .cover-mark-r {
          top: 12px;
          font-size: 8px;
          letter-spacing: 0.08em;
        }
        .related-mini-thumb .cover-mark-r {
          right: 10px;
        }
        .related-mini-copy {
          min-width: 0;
          padding: 16px;
          display: flex;
          flex-direction: column;
        }
        .related-mini-copy h3 {
          margin: 8px 0 0;
          font-size: 18px;
          line-height: 1.12;
        }
        .related-mini-copy p {
          margin: 10px 0 14px;
          color: var(--ink-dim);
          font-size: 13px;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .related-mini-copy .mono {
          margin-top: auto;
          color: var(--ink-soft);
          font-size: 10px;
          letter-spacing: 0.12em;
        }
        @media (max-width: 860px) {
          .related-compact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 680px) {
          .related-section-head { align-items: start; }
          .related-compact-grid { grid-template-columns: 1fr; }
          .related-mini-card { grid-template-columns: 96px minmax(0, 1fr); min-height: 132px; }
          .related-mini-thumb { min-height: 132px; }
          .related-mini-copy { padding: 14px; }
        }
      `}</style>
    </section>
  );
}

Object.assign(window, {
  MusicPage,
  AlbumLibraryPage,
  AlbumDetailPage,
  generateChordSketch,
});
