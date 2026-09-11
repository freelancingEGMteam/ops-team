import { createPublicServerClient } from "./supabase";
import type { Album, Episode, Product, Track } from "@/types/domain";

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
export type CatalogProduct = Product & {
  cover_url: string | null;
  cover_alt: string | null;
};

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
  return {
    ...row,
    cover_url: publicMediaUrl(cover),
    cover_alt: cover?.alt_text || null,
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
        "*,cover:media_assets!products_cover_asset_id_fkey(bucket,path,alt_text)",
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
      "*,cover:media_assets!products_cover_asset_id_fkey(bucket,path,alt_text)",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return data ? productRow(data) : null;
}

export function formatMoney(cents: number) {
  return cents === 0
    ? "Free"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(cents / 100);
}
