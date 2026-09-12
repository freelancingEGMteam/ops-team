// Generated-shape frontend contract. Regenerate from Supabase with `pnpm db:types`.
import type {
  Album,
  DownloadEntitlement,
  Episode,
  MediaAsset,
  Order,
  OrderItem,
  Product,
  ProductVariant,
  Profile,
  Track,
} from "./domain";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<Profile>;
      media_assets: Table<MediaAsset>;
      albums: Table<Album>;
      tracks: Table<Track>;
      episodes: Table<Episode>;
      episode_chapters: Table<{
        id: string;
        episode_id: string;
        sort_order: number;
        time_seconds: number;
        title: string;
      }>;
      episode_themes: Table<{ episode_id: string; theme: string }>;
      products: Table<Product>;
      product_variants: Table<ProductVariant>;
      product_items: Table<{
        id: string;
        variant_id: string;
        media_asset_id: string;
        label: string | null;
      }>;
      carts: Table<{
        id: string;
        user_id: string | null;
        anonymous_id: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }>;
      cart_items: Table<{
        id: string;
        cart_id: string;
        variant_id: string;
        quantity: number;
        created_at: string;
      }>;
      orders: Table<Order>;
      order_items: Table<OrderItem>;
      download_entitlements: Table<DownloadEntitlement>;
      download_events: Table<{
        id: string;
        entitlement_id: string;
        user_id: string;
        created_at: string;
        ip_hash: string | null;
      }>;
      refunds: Table<{
        id: string;
        order_id: string;
        amount_cents: number;
        reason: string | null;
        stripe_refund_id: string | null;
        created_by: string;
        created_at: string;
      }>;
      refund_items: Table<{ refund_id: string; order_item_id: string }>;
      admin_invites: Table<{
        id: string;
        email: string;
        role: string;
        invited_by: string;
        expires_at: string;
        accepted_at: string | null;
        created_at: string;
      }>;
      contact_messages: Table<{
        id: string;
        name: string | null;
        email: string;
        reason: string | null;
        message: string;
        status: string;
        created_at: string;
      }>;
      newsletter_subscribers: Table<{
        id: string;
        email: string;
        status: string;
        created_at: string;
      }>;
      site_settings: Table<{
        key: string;
        value: Json;
        is_public: boolean;
        updated_by: string | null;
        updated_at: string;
      }>;
      webhook_events: Table<{
        id: string;
        provider: string;
        event_type: string;
        processed_at: string;
        payload: Json;
      }>;
      audit_log: Table<{
        id: string;
        actor_id: string | null;
        action: string;
        entity_type: string;
        entity_id: string | null;
        metadata: Json;
        created_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_staff: { Args: { allowed_roles: string[] }; Returns: boolean };
    };
    Enums: {
      user_role: "owner" | "admin" | "editor" | "support" | "customer";
      publish_status:
        "draft" | "review" | "scheduled" | "published" | "archived";
      product_kind:
        | "bundle"
        | "album_mp3"
        | "album_chords"
        | "album_lyrics"
        | "track_mp3"
        | "track_chords"
        | "free"
        | "donation";
      order_status:
        "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
      media_kind:
        | "cover"
        | "video"
        | "audio"
        | "audio_preview"
        | "pdf"
        | "thumbnail"
        | "image"
        | "bundle";
    };
    CompositeTypes: Record<string, never>;
  };
}
