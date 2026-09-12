export type UserRole = "owner" | "admin" | "editor" | "support" | "customer";
export type PublishStatus =
  "draft" | "review" | "scheduled" | "published" | "archived";
export type ProductKind =
  | "bundle"
  | "album_mp3"
  | "album_chords"
  | "album_lyrics"
  | "track_mp3"
  | "track_chords"
  | "free"
  | "donation";
export type OrderStatus =
  "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
export type MediaKind =
  | "cover"
  | "video"
  | "audio"
  | "audio_preview"
  | "pdf"
  | "thumbnail"
  | "image"
  | "bundle";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: "active" | "disabled";
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MediaAsset {
  id: string;
  bucket: "public-media" | "private-downloads" | "source-media";
  path: string;
  kind: MediaKind;
  title: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  processing_status: "uploading" | "processing" | "ready" | "failed";
  created_by: string | null;
  created_at: string;
}

export interface Album {
  id: string;
  slug: string;
  title: string;
  artist: string;
  year: number | null;
  scripture: string | null;
  theme: string | null;
  description: string | null;
  runtime_seconds: number | null;
  cover_asset_id: string | null;
  preview_asset_id: string | null;
  is_featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  album_id: string;
  track_number: number;
  title: string;
  runtime_seconds: number | null;
  song_key: string | null;
  lyrics: string | null;
  audio_asset_id: string | null;
  preview_asset_id: string | null;
  chord_pdf_asset_id: string | null;
  lyrics_pdf_asset_id: string | null;
  price_mp3_cents: number;
  price_chords_cents: number;
  status: PublishStatus;
  scheduled_for: string | null;
}

export interface Episode {
  id: string;
  slug: string;
  title: string;
  testament: string | null;
  book: string | null;
  passage: string | null;
  runtime_seconds: number | null;
  year: number | null;
  summary: string | null;
  hero_video_asset_id: string | null;
  poster_asset_id: string | null;
  related_album_id: string | null;
  is_featured: boolean;
  status: PublishStatus;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  label: string | null;
  kind: ProductKind;
  price_cents: number;
  currency: "usd";
  stripe_price_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  stripe_product_id: string | null;
  stripe_tax_code: string | null;
  cover_asset_id: string | null;
  album_id: string | null;
  track_id: string | null;
  tag: string | null;
  status: PublishStatus;
  published_at: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  email: string;
  status: OrderStatus;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  currency: "usd";
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string | null;
  title_snapshot: string;
  price_cents_snapshot: number;
  quantity: number;
}

export interface DownloadEntitlement {
  id: string;
  user_id: string;
  order_item_id: string;
  media_asset_id: string;
  revoked_at: string | null;
  revoked_reason: string | null;
  created_at: string;
}

export const staffRoles: UserRole[] = ["owner", "admin", "editor", "support"];
export const publishStatuses: PublishStatus[] = [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
];

export function isStaff(
  role: UserRole | null | undefined,
): role is Exclude<UserRole, "customer"> {
  return Boolean(role && staffRoles.includes(role));
}

export function canPublish(role: UserRole | null | undefined) {
  return role === "owner" || role === "admin";
}
