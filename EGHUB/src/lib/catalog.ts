import { createPublicServerClient } from "./supabase";
import {
  collectionLabel,
  collectionsForProduct,
  type CollectionKey,
} from "./collections";
import type {
  Album,
  Episode,
  Product,
  ProductVariant,
  Track,
} from "@/types/domain";

interface PublicMediaReference {
  bucket: string;
  path: string;
  alt_text: string | null;
}

export type CatalogAlbum = Album & {
  cover_url: string | null;
  cover_alt: string | null;
};
export type CatalogEpisode = Episode & {
  poster_url: string | null;
  poster_alt: string | null;
  video_url: string | null;
};
export type CatalogProductVariant = ProductVariant & { download_count: number };

export type CatalogProduct = Product & {
  cover_url: string | null;
  cover_alt: string | null;
  variants: CatalogProductVariant[];
  download_count: number;
  starting_price_cents: number;
  max_price_cents: number;
  collections: CollectionKey[];
  collection_labels: string[];
};

/**
 * Return the local, precomposed 16:9 artwork for a public media URL.
 *
 * The catalog keeps the original Supabase URL as its source of truth, while
 * the storefront uses generated landscape derivatives so portrait covers are
 * never cropped in cards or detail pages.
 */
export function landscapeArtworkUrl(sourceUrl: string | null) {
  if (!sourceUrl) return null;
  const filename = sourceUrl.split("/").pop()?.split("?")[0];
  if (!filename) return null;
  const stem = filename.replace(/\.[^.]+$/, "");
  return `/artwork/landscape/${stem}.png`;
}

export interface CatalogSnapshot {
  albums: CatalogAlbum[];
  episodes: CatalogEpisode[];
  products: CatalogProduct[];
}

const emptyCatalog: CatalogSnapshot = {
  albums: [],
  episodes: [],
  products: [],
};

function mediaReference(value: unknown): PublicMediaReference | null {
  if (Array.isArray(value)) return (value[0] as PublicMediaReference) || null;
  return (value as PublicMediaReference | null) || null;
}

function publicMediaUrl(value: unknown) {
  const media = mediaReference(value);
  const base = import.meta.env.PUBLIC_SUPABASE_URL;
  if (!media || media.bucket !== "public-media" || !base) return null;
  const path = media.path.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${media.bucket}/${path}`;
}

function albumRow(row: any): CatalogAlbum {
  const cover = mediaReference(row.cover);
  return {
    ...row,
    cover_url: publicMediaUrl(cover),
    cover_alt: cover?.alt_text || null,
  };
}

function episodeRow(row: any): CatalogEpisode {
  const poster = mediaReference(row.poster);
  return {
    ...row,
    poster_url: publicMediaUrl(poster),
    poster_alt: poster?.alt_text || null,
    video_url: publicMediaUrl(row.hero_video),
  };
}

function productRow(row: any): CatalogProduct {
  const cover = mediaReference(row.cover);
  const variants: CatalogProductVariant[] = (row.variants || [])
    .map(({ items, ...variant }: any) => ({
      ...variant,
      download_count: Array.isArray(items) ? items.length : 0,
    }))
    .sort(
      (a: CatalogProductVariant, b: CatalogProductVariant) =>
        a.sort_order - b.sort_order,
    );
  const activePrices = variants
    .filter((variant) => variant.is_active)
    .map((variant) => variant.price_cents);
  const downloadCount = variants.reduce(
    (sum, variant) => sum + variant.download_count,
    0,
  );
  const collections = collectionsForProduct({
    title: row.title,
    tag: row.tag,
    variants,
  });
  return {
    ...row,
    variants,
    cover_url: publicMediaUrl(cover),
    cover_alt: cover?.alt_text || null,
    download_count: downloadCount,
    starting_price_cents: activePrices.length ? Math.min(...activePrices) : 0,
    max_price_cents: activePrices.length ? Math.max(...activePrices) : 0,
    collections,
    collection_labels: collections.map(collectionLabel),
  };
}

export async function getCatalog(): Promise<CatalogSnapshot> {
  const supabase = createPublicServerClient();
  if (!supabase) return emptyCatalog;

  const [albums, episodes, products] = await Promise.all([
    supabase
      .from("albums")
      .select(
        "*,cover:media_assets!albums_cover_asset_id_fkey(bucket,path,alt_text)",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("episodes")
      .select(
        "*,poster:media_assets!episodes_poster_asset_id_fkey(bucket,path,alt_text),hero_video:media_assets!episodes_hero_video_asset_id_fkey(bucket,path,alt_text)",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false }),
    supabase
      .from("products")
      .select(
        "*,cover:media_assets!products_cover_asset_id_fkey(bucket,path,alt_text),variants:product_variants(*,items:product_items(id))",
      )
      .eq("status", "published")
      .order("published_at", { ascending: false }),
  ]);

  return {
    albums: (albums.data ?? []).map(albumRow),
    episodes: (episodes.data ?? []).map(episodeRow),
    products: (products.data ?? []).map(productRow),
  };
}

export async function getAlbum(
  slug: string,
): Promise<{ album: CatalogAlbum; tracks: Track[] } | null> {
  const supabase = createPublicServerClient();
  if (!supabase) return null;
  const { data: album } = await supabase
    .from("albums")
    .select(
      "*,cover:media_assets!albums_cover_asset_id_fkey(bucket,path,alt_text)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!album) return null;
  const { data: tracks } = await supabase
    .from("tracks")
    .select("*")
    .eq("album_id", album.id)
    .eq("status", "published")
    .order("track_number");
  return { album: albumRow(album), tracks: (tracks ?? []) as Track[] };
}

export async function getEpisode(slug: string): Promise<CatalogEpisode | null> {
  const supabase = createPublicServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("episodes")
    .select(
      "*,poster:media_assets!episodes_poster_asset_id_fkey(bucket,path,alt_text),hero_video:media_assets!episodes_hero_video_asset_id_fkey(bucket,path,alt_text)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? episodeRow(data) : null;
}

export async function getProduct(slug: string): Promise<CatalogProduct | null> {
  const supabase = createPublicServerClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select(
      "*,cover:media_assets!products_cover_asset_id_fkey(bucket,path,alt_text),variants:product_variants(*,items:product_items(id))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? productRow(data) : null;
}

/**
 * products.album_id is effectively unpopulated on the imported catalog, so
 * matching on it alone finds nothing. Fall back to the title match the
 * release listing already relies on to spot the same record twice.
 */
export function productMatchesAlbum(
  product: Pick<CatalogProduct, "album_id" | "title">,
  album: { id: string; title: string },
) {
  if (product.album_id) return product.album_id === album.id;
  return (
    product.title.trim().toLowerCase() === album.title.trim().toLowerCase()
  );
}

/**
 * Ranked by how many catalog collections a product shares with this one, so
 * a Psalms chord sheet surfaces other Psalms and other chord sheets first,
 * then falls back to recent releases rather than showing nothing.
 */
export async function getRelatedProducts(
  product: CatalogProduct,
  limit = 4,
): Promise<CatalogProduct[]> {
  const supabase = createPublicServerClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(
      "*,cover:media_assets!products_cover_asset_id_fkey(bucket,path,alt_text),variants:product_variants(*,items:product_items(id))",
    )
    .eq("status", "published")
    .neq("id", product.id)
    .order("published_at", { ascending: false })
    .limit(40);
  const shared = (other: CatalogProduct) =>
    other.collections.filter((collection) =>
      product.collections.includes(collection),
    ).length;
  return (data ?? [])
    .map(productRow)
    .sort((a, b) => shared(b) - shared(a))
    .slice(0, limit);
}

/**
 * Look-alike products get consolidated into one parent with variants. The
 * absorbed products are archived and left pointing at their replacement so
 * their existing URLs redirect instead of 404ing.
 */
export async function getMergedProductSlug(slug: string) {
  const supabase = createPublicServerClient();
  if (!supabase) return null;
  const { data: retired } = await supabase
    .from("products")
    .select("merged_into_product_id")
    .eq("slug", slug)
    .maybeSingle();
  const targetId = (retired as any)?.merged_into_product_id;
  if (!targetId) return null;
  const { data: target } = await supabase
    .from("products")
    .select("slug")
    .eq("id", targetId)
    .eq("status", "published")
    .maybeSingle();
  return ((target as any)?.slug as string | undefined) ?? null;
}

export function formatMoney(cents: number) {
  return cents === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
}

export function formatPriceRange(minCents: number, maxCents: number) {
  return minCents === maxCents
    ? formatMoney(minCents)
    : `From ${formatMoney(minCents)}`;
}

const variantKindLabels: Record<string, string> = {
  album_mp3: "MP3 audio download",
  track_mp3: "MP3 audio download",
  album_chords: "Chord chart PDF for worship leaders",
  track_chords: "Chord chart PDF",
  album_lyrics: "Lyric sheet PDF",
  bundle: "Bundle of audio and chord/lyric files",
  free: "Free digital download",
  donation: "A gift to support Eternal Grace Hub",
};

export function variantKindLabel(kind: string) {
  return variantKindLabels[kind] || "Digital download";
}
