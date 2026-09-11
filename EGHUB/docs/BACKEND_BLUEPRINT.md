# EternalGrace Hub Backend Blueprint

This is the working structure for turning the current frontend prototype into a real content, commerce, and admin platform.

## Recommended Stack

- Database: Postgres, preferably Supabase to get auth, storage policies, row-level security, and admin tooling quickly.
- Auth: Supabase Auth or Clerk. Start with Supabase if the database is Supabase.
- Payments: Stripe Checkout first, Stripe Payment Element later if we want an embedded checkout.
- Storage: Supabase Storage for videos, audio previews, MP3 downloads, PDFs, artwork, and thumbnails.
- Email: Resend for receipts, download links, contact forms, and admin notifications.
- Admin app: keep inside this app first under `#/admin`, then split only if needed.

Starter implementation files:
- `docs/BACKEND_SCHEMA.sql` contains the first-pass Postgres schema for users, uploads, albums, tracks, episodes, products, cart, orders, download grants, donations, settings, and audit logs.
- `#/admin` in the prototype now mirrors this structure so we can wire each section to the database incrementally.

## Roles

- `owner`: everything, including billing settings, publishing, user roles, refunds.
- `admin`: content, products, orders, uploads, customer support.
- `editor`: albums, tracks, episodes, resources, uploads; cannot see payment details or user roles.
- `support`: orders, customers, resend downloads, issue refunds when allowed.
- `customer`: account dashboard, orders, downloads, saved cart.

## Core Tables

### Users And Access

- `profiles`
  - `id uuid primary key`
  - `email text unique`
  - `full_name text`
  - `role text`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `admin_invites`
  - `id uuid primary key`
  - `email text`
  - `role text`
  - `token_hash text`
  - `expires_at timestamptz`
  - `accepted_at timestamptz`

### Media Library

- `media_assets`
  - `id uuid primary key`
  - `bucket text`
  - `path text`
  - `kind text` (`cover`, `video`, `audio`, `audio_preview`, `pdf`, `thumbnail`, `image`)
  - `mime_type text`
  - `size_bytes bigint`
  - `duration_seconds int`
  - `width int`
  - `height int`
  - `alt_text text`
  - `created_by uuid`
  - `created_at timestamptz`

### BibleInVideo

- `episodes`
  - `id uuid primary key`
  - `slug text unique`
  - `title text`
  - `testament text`
  - `book text`
  - `passage text`
  - `runtime_seconds int`
  - `year int`
  - `summary text`
  - `status text` (`draft`, `scheduled`, `published`, `archived`)
  - `hero_video_asset_id uuid`
  - `poster_asset_id uuid`
  - `related_album_id uuid`
  - `published_at timestamptz`

- `episode_chapters`
  - `id uuid primary key`
  - `episode_id uuid`
  - `sort_order int`
  - `time_seconds int`
  - `title text`

- `episode_themes`
  - `episode_id uuid`
  - `theme text`

### Worship Albums And Tracks

- `albums`
  - `id uuid primary key`
  - `slug text unique`
  - `title text`
  - `artist text`
  - `year int`
  - `scripture text`
  - `theme text`
  - `description text`
  - `runtime_seconds int`
  - `cover_label text`
  - `cover_hue int`
  - `cover_asset_id uuid`
  - `video_preview_asset_id uuid`
  - `status text`
  - `published_at timestamptz`

- `tracks`
  - `id uuid primary key`
  - `album_id uuid`
  - `track_number int`
  - `title text`
  - `runtime_seconds int`
  - `song_key text`
  - `lyrics text`
  - `audio_asset_id uuid`
  - `preview_asset_id uuid`
  - `chord_pdf_asset_id uuid`
  - `lyrics_pdf_asset_id uuid`
  - `price_mp3_cents int`
  - `price_chords_cents int`
  - `status text`

### Products

- `products`
  - `id uuid primary key`
  - `slug text unique`
  - `title text`
  - `kind text` (`bundle`, `album_mp3`, `album_chords`, `album_lyrics`, `track_mp3`, `track_chords`, `free`)
  - `description text`
  - `price_cents int`
  - `status text`
  - `stripe_price_id text`
  - `cover_asset_id uuid`
  - `tag text`
  - `hue int`

- `product_items`
  - `id uuid primary key`
  - `product_id uuid`
  - `asset_id uuid`
  - `album_id uuid`
  - `track_id uuid`
  - `label text`

### Cart, Orders, Downloads

- `carts`
  - `id uuid primary key`
  - `user_id uuid null`
  - `anonymous_id text null`
  - `status text` (`active`, `converted`, `abandoned`)
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `cart_items`
  - `id uuid primary key`
  - `cart_id uuid`
  - `product_id uuid null`
  - `track_id uuid null`
  - `item_type text`
  - `title_snapshot text`
  - `price_cents_snapshot int`
  - `quantity int`

- `orders`
  - `id uuid primary key`
  - `order_number text unique`
  - `user_id uuid null`
  - `email text`
  - `status text` (`pending`, `paid`, `failed`, `refunded`, `partially_refunded`)
  - `subtotal_cents int`
  - `donation_cents int`
  - `total_cents int`
  - `stripe_session_id text`
  - `stripe_payment_intent_id text`
  - `created_at timestamptz`

- `order_items`
  - `id uuid primary key`
  - `order_id uuid`
  - `product_id uuid null`
  - `track_id uuid null`
  - `title_snapshot text`
  - `price_cents_snapshot int`
  - `quantity int`

- `download_grants`
  - `id uuid primary key`
  - `order_item_id uuid`
  - `asset_id uuid`
  - `token_hash text`
  - `expires_at timestamptz`
  - `download_count int`
  - `max_downloads int`

### Site Operations

- `newsletter_subscribers`
- `contact_messages`
- `settings`
- `audit_log`
- `webhook_events`

## API Routes

Public reads:
- `GET /api/site/bootstrap`
- `GET /api/search?q=&type=`
- `GET /api/albums`
- `GET /api/albums/:slug`
- `GET /api/episodes`
- `GET /api/episodes/:slug`
- `GET /api/products`
- `GET /api/products/:slug`

Cart and checkout:
- `POST /api/cart/items`
- `PATCH /api/cart/items/:id`
- `DELETE /api/cart/items/:id`
- `GET /api/cart`
- `POST /api/checkout/session`
- `POST /api/orders/:id/resend-downloads`
- `GET /api/downloads/:token`

Admin:
- `POST /api/admin/uploads/sign`
- `POST /api/admin/media`
- `POST /api/admin/albums`
- `PATCH /api/admin/albums/:id`
- `POST /api/admin/tracks`
- `PATCH /api/admin/tracks/:id`
- `POST /api/admin/episodes`
- `PATCH /api/admin/episodes/:id`
- `POST /api/admin/products`
- `PATCH /api/admin/products/:id`
- `GET /api/admin/orders`
- `GET /api/admin/customers`
- `GET /api/admin/audit-log`

Webhooks:
- `POST /api/webhooks/stripe`

## Frontend Selectors

These selectors are the stable interface between database/API records and UI screens.

- `selectHomeFeatureAlbums(state)` -> six latest published albums.
- `selectHomeFeatureEpisodes(state)` -> six featured published episodes.
- `selectWorshipFeaturedAlbums(state)` -> three highlighted albums.
- `selectResourceProducts(state, filter, query)` -> resource product grid.
- `selectAlbumBySlug(state, slug)` -> album detail page.
- `selectAlbumPurchasableFormats(album)` -> album MP3, chord book, lyrics PDF.
- `selectTrackPurchaseOptions(track)` -> MP3 and Chords buttons.
- `selectRelatedAlbums(album)` -> six companion albums.
- `selectEpisodeBySlug(state, slug)` -> BibleInVideo detail page.
- `selectRelatedAlbumForEpisode(episode)` -> sister album card.
- `selectSearchResults(state, query, type)` -> site-wide search page.
- `selectCartItems(cart)` -> cart lines.
- `selectCheckoutSummary(cartOrProduct)` -> checkout totals and order review.
- `selectAdminDashboardStats(state)` -> counts and health cards.
- `selectAdminUploadQueue(state)` -> uploads needing processing.

## Admin Dashboard Structure

Top-level tabs:
- Overview
- Media Library
- Albums
- Tracks
- Episodes
- Products
- Orders
- Customers
- Coupons
- Settings
- Users

Current prototype routes:
- `#/admin`
- `#/admin/uploads`
- `#/admin/albums`
- `#/admin/tracks`
- `#/admin/videos`
- `#/admin/products`
- `#/admin/orders`
- `#/admin/customers`
- `#/admin/users`
- `#/admin/settings`
- `#/admin/audit`

Overview widgets:
- Total sales
- Pending orders
- Downloads this week
- Published albums
- Published episodes
- Upload queue
- Failed webhooks
- Recent contact messages

Media Library:
- Upload audio, video, PDFs, artwork, thumbnails.
- Show processing status.
- Copy asset URL.
- Replace asset without changing public content record.
- Validate audio previews are 15 seconds.

Album editor:
- Title, slug, artist, year, scripture, theme, description.
- Cover artwork/video preview.
- Track table with reorder, edit, audio, 15-second preview, lyrics, chord PDF, price toggles.
- Product builder for album bundle, MP3 album, chord book, lyrics PDF.

Episode editor:
- Title, slug, testament, book, passage, runtime, summary.
- Full video, poster, chapters, themes.
- Related album selector.
- Status and scheduled publish.

Product editor:
- Product kind, price, tag, artwork, included assets.
- Stripe price mapping.
- Free/downloadable toggle.
- Product visibility.

Orders:
- Status, customer email, line items, download grants.
- Resend downloads.
- Refund or partial refund.
- View Stripe session.

Users:
- Customer accounts and admin users.
- Role management.
- Invite admin.
- Disable account.

Settings:
- Site SEO.
- Payment keys.
- Download expiration/max downloads.
- Donation message and mercy verse.
- Email templates.

## Upload Flow

1. Admin requests signed upload URL.
2. Browser uploads directly to storage.
3. App creates `media_assets` row.
4. Background job inspects file metadata.
5. If audio, generate 15-second preview and waveform metadata.
6. Admin attaches asset to album, track, episode, or product.
7. Publish action validates required assets.

## Checkout Flow

1. Visitor adds album format, track MP3, track chords, product, or donation to cart.
2. Cart stores item snapshots.
3. Checkout creates Stripe session.
4. Stripe webhook marks order paid.
5. Backend creates download grants for purchased assets.
6. Email receipt includes download links.
7. Customer can access downloads from account page.

## Dashboard Build Order

1. Replace static `data.js` with API bootstrap data.
2. Build auth and protect `#/admin`.
3. Build media uploads and asset library.
4. Build albums/tracks CRUD.
5. Build products CRUD.
6. Build cart persistence and Stripe Checkout.
7. Build orders/download grants.
8. Build customers/users/roles.
9. Build search index from database.
10. Add audit log and operational alerts.
