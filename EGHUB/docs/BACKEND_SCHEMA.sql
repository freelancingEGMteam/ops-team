-- EternalGrace Hub starter Postgres schema.
-- Target: Supabase/Postgres with Stripe, storage buckets, and admin roles.

create extension if not exists "pgcrypto";

create type public.publish_status as enum ('draft', 'review', 'scheduled', 'published', 'archived');
create type public.user_role as enum ('owner', 'admin', 'editor', 'support', 'customer');
create type public.media_kind as enum ('cover', 'video', 'audio', 'audio_preview', 'pdf', 'thumbnail', 'image');
create type public.product_kind as enum (
  'bundle',
  'album_mp3',
  'album_chords',
  'album_lyrics',
  'track_mp3',
  'track_chords',
  'free',
  'donation'
);
create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.user_role not null default 'editor',
  token_hash text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  path text not null,
  kind public.media_kind not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds int,
  width int,
  height int,
  alt_text text,
  processing_status text not null default 'ready',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (bucket, path)
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  artist text not null default 'Eternal Grace Music',
  year int,
  scripture text,
  theme text,
  description text,
  runtime_seconds int,
  cover_label text,
  cover_hue int,
  cover_asset_id uuid references public.media_assets(id),
  video_preview_asset_id uuid references public.media_assets(id),
  is_featured boolean not null default false,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  track_number int not null,
  title text not null,
  runtime_seconds int,
  song_key text,
  lyrics text,
  audio_asset_id uuid references public.media_assets(id),
  preview_asset_id uuid references public.media_assets(id),
  chord_pdf_asset_id uuid references public.media_assets(id),
  lyrics_pdf_asset_id uuid references public.media_assets(id),
  price_mp3_cents int not null default 200,
  price_chords_cents int not null default 200,
  status public.publish_status not null default 'draft',
  unique (album_id, track_number)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  testament text,
  book text,
  passage text,
  runtime_seconds int,
  year int,
  summary text,
  hero_video_asset_id uuid references public.media_assets(id),
  poster_asset_id uuid references public.media_assets(id),
  related_album_id uuid references public.albums(id),
  is_featured boolean not null default false,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.episode_chapters (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  sort_order int not null,
  time_seconds int not null,
  title text not null
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  kind public.product_kind not null,
  description text,
  price_cents int not null default 0,
  stripe_price_id text,
  album_id uuid references public.albums(id),
  track_id uuid references public.tracks(id),
  cover_asset_id uuid references public.media_assets(id),
  tag text,
  hue int,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  asset_id uuid references public.media_assets(id),
  album_id uuid references public.albums(id),
  track_id uuid references public.tracks(id),
  label text
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id),
  anonymous_id text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid references public.products(id),
  track_id uuid references public.tracks(id),
  item_type text not null,
  title_snapshot text not null,
  price_cents_snapshot int not null,
  quantity int not null default 1
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid references public.profiles(id),
  email text not null,
  status public.order_status not null default 'pending',
  subtotal_cents int not null default 0,
  donation_cents int not null default 0,
  total_cents int not null default 0,
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  track_id uuid references public.tracks(id),
  title_snapshot text not null,
  price_cents_snapshot int not null,
  quantity int not null default 1
);

create table public.download_grants (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  download_count int not null default 0,
  max_downloads int not null default 5,
  created_at timestamptz not null default now()
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.profiles(id),
  amount_cents int not null,
  message text,
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  reason text,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed',
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index albums_status_published_idx on public.albums (status, published_at desc);
create index episodes_status_published_idx on public.episodes (status, published_at desc);
create index tracks_album_number_idx on public.tracks (album_id, track_number);
create index products_kind_status_idx on public.products (kind, status);
create index cart_items_cart_idx on public.cart_items (cart_id);
create index order_items_order_idx on public.order_items (order_id);
create index download_grants_token_idx on public.download_grants (token_hash);
