create extension if not exists "pgcrypto";
create extension if not exists "pg_cron" with schema pg_catalog;

create type public.user_role as enum ('owner', 'admin', 'editor', 'support', 'customer');
create type public.account_status as enum ('active', 'disabled');
create type public.publish_status as enum ('draft', 'review', 'scheduled', 'published', 'archived');
create type public.media_kind as enum ('cover', 'video', 'audio', 'audio_preview', 'pdf', 'thumbnail', 'image', 'bundle');
create type public.media_processing_status as enum ('uploading', 'processing', 'ready', 'failed');
create type public.product_kind as enum ('bundle', 'album_mp3', 'album_chords', 'album_lyrics', 'track_mp3', 'track_chords', 'free', 'donation');
create type public.order_status as enum ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.user_role not null check (role <> 'customer' and role <> 'owner'),
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index admin_invites_active_email_idx on public.admin_invites(lower(email)) where accepted_at is null;

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('public-media', 'private-downloads', 'source-media')),
  path text not null,
  kind public.media_kind not null,
  title text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  width integer,
  height integer,
  alt_text text,
  processing_status public.media_processing_status not null default 'uploading',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(bucket, path)
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  artist text not null default 'Eternal Grace Music',
  year integer,
  scripture text,
  theme text,
  description text,
  runtime_seconds integer,
  cover_asset_id uuid references public.media_assets(id),
  preview_asset_id uuid references public.media_assets(id),
  is_featured boolean not null default false,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_for is not null)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums(id) on delete cascade,
  track_number integer not null check (track_number > 0),
  title text not null,
  runtime_seconds integer,
  song_key text,
  lyrics text,
  audio_asset_id uuid references public.media_assets(id),
  preview_asset_id uuid references public.media_assets(id),
  chord_pdf_asset_id uuid references public.media_assets(id),
  lyrics_pdf_asset_id uuid references public.media_assets(id),
  price_mp3_cents integer not null default 200 check (price_mp3_cents >= 0),
  price_chords_cents integer not null default 200 check (price_chords_cents >= 0),
  status public.publish_status not null default 'draft',
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(album_id, track_number),
  check (status <> 'scheduled' or scheduled_for is not null)
);

create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  testament text,
  book text,
  passage text,
  runtime_seconds integer,
  year integer,
  summary text,
  hero_video_asset_id uuid references public.media_assets(id),
  poster_asset_id uuid references public.media_assets(id),
  related_album_id uuid references public.albums(id) on delete set null,
  is_featured boolean not null default false,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'scheduled' or scheduled_for is not null)
);

create table public.episode_chapters (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  sort_order integer not null,
  time_seconds integer not null check (time_seconds >= 0),
  title text not null,
  unique(episode_id, sort_order)
);

create table public.episode_themes (
  episode_id uuid not null references public.episodes(id) on delete cascade,
  theme text not null,
  primary key(episode_id, theme)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  kind public.product_kind not null,
  description text,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_product_id text unique,
  stripe_price_id text unique,
  stripe_tax_code text,
  album_id uuid references public.albums(id) on delete set null,
  track_id uuid references public.tracks(id) on delete set null,
  cover_asset_id uuid references public.media_assets(id) on delete set null,
  tag text,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (price_cents = 0 or stripe_tax_code is not null),
  check (status <> 'scheduled' or scheduled_for is not null)
);

create table public.product_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id),
  label text,
  unique(product_id, media_asset_id)
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  anonymous_id text,
  status text not null default 'active' check (status in ('active', 'converted', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or anonymous_id is not null)
);

create unique index carts_active_user_idx on public.carts(user_id) where status = 'active' and user_id is not null;
create unique index carts_active_anon_idx on public.carts(anonymous_id) where status = 'active' and anonymous_id is not null;

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity integer not null default 1 check (quantity between 1 and 20),
  created_at timestamptz not null default now(),
  unique(cart_id, product_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references public.profiles(id),
  email text not null,
  status public.order_status not null default 'pending',
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  title_snapshot text not null,
  price_cents_snapshot integer not null check (price_cents_snapshot >= 0),
  quantity integer not null default 1 check (quantity > 0)
);

create table public.download_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  media_asset_id uuid not null references public.media_assets(id),
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  unique(user_id, order_item_id, media_asset_id)
);

create table public.download_events (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid not null references public.download_entitlements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  amount_cents integer not null check (amount_cents > 0),
  reason text,
  stripe_refund_id text unique,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.refund_items (
  refund_id uuid not null references public.refunds(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id),
  primary key(refund_id, order_item_id)
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  reason text,
  message text not null check (char_length(message) between 10 and 10000),
  status text not null default 'new' check (status in ('new', 'open', 'resolved', 'spam')),
  created_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table public.webhook_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now()
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index albums_public_idx on public.albums(status, published_at desc);
create index tracks_album_idx on public.tracks(album_id, track_number);
create index episodes_public_idx on public.episodes(status, published_at desc);
create index products_public_idx on public.products(status, published_at desc);
create index cart_items_cart_idx on public.cart_items(cart_id);
create index orders_user_idx on public.orders(user_id, created_at desc);
create index order_items_order_idx on public.order_items(order_id);
create index entitlements_user_idx on public.download_entitlements(user_id, created_at desc) where revoked_at is null;
create index audit_log_created_idx on public.audit_log(created_at desc);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger albums_updated before update on public.albums for each row execute function public.set_updated_at();
create trigger tracks_updated before update on public.tracks for each row execute function public.set_updated_at();
create trigger episodes_updated before update on public.episodes for each row execute function public.set_updated_at();
create trigger products_updated before update on public.products for each row execute function public.set_updated_at();
create trigger carts_updated before update on public.carts for each row execute function public.set_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();

create or replace function public.publish_scheduled_content() returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.albums
    set status = 'published', published_at = coalesce(published_at, now()), scheduled_for = null
    where status = 'scheduled' and scheduled_for <= now();
  update public.tracks
    set status = 'published', scheduled_for = null
    where status = 'scheduled' and scheduled_for <= now();
  update public.episodes
    set status = 'published', published_at = coalesce(published_at, now()), scheduled_for = null
    where status = 'scheduled' and scheduled_for <= now();
  update public.products
    set status = 'published', published_at = coalesce(published_at, now()), scheduled_for = null
    where status = 'scheduled' and scheduled_for <= now();
end;
$$;

select cron.schedule(
  'egh-publish-scheduled-content',
  '* * * * *',
  'select public.publish_scheduled_content();'
);

create or replace function public.handle_new_auth_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare invited_role public.user_role;
begin
  select role into invited_role
  from public.admin_invites
  where lower(email) = lower(coalesce(new.email, '')) and accepted_at is null and expires_at > now()
  order by created_at desc limit 1;
  insert into public.profiles(id, email, full_name, avatar_url, role)
  values(new.id, coalesce(new.email, ''), nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'avatar_url',''), coalesce(invited_role, 'customer'));
  if invited_role is not null then
    update public.admin_invites set accepted_at = now()
    where lower(email) = lower(coalesce(new.email, '')) and accepted_at is null and expires_at > now();
  end if;
  return new;
end;
$$;
create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();

create or replace function public.current_user_role() returns public.user_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.is_staff(allowed_roles public.user_role[]) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() = any(allowed_roles), false);
$$;

create or replace function public.can_write_content(next_status public.publish_status) returns boolean
language sql stable security definer set search_path = '' as $$
  select case public.current_user_role()
    when 'owner' then true when 'admin' then true
    when 'editor' then next_status in ('draft','review')
    else false end;
$$;

create or replace function public.media_is_locked(asset_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists(select 1 from public.albums where status in ('scheduled','published','archived') and asset_id in (cover_asset_id, preview_asset_id))
    or exists(select 1 from public.tracks where status in ('scheduled','published','archived') and asset_id in (audio_asset_id, preview_asset_id, chord_pdf_asset_id, lyrics_pdf_asset_id))
    or exists(select 1 from public.episodes where status in ('scheduled','published','archived') and asset_id in (hero_video_asset_id, poster_asset_id))
    or exists(select 1 from public.products where status in ('scheduled','published','archived') and cover_asset_id = asset_id)
    or exists(
      select 1 from public.product_items pi
      join public.products p on p.id = pi.product_id
      where pi.media_asset_id = asset_id and p.status in ('scheduled','published','archived')
    );
$$;

create or replace function public.storage_object_is_locked(target_bucket text, target_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.media_assets m
    where m.bucket = target_bucket and m.path = target_path and public.media_is_locked(m.id)
  );
$$;

create or replace function public.audit_content_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare row_id uuid; actor uuid;
begin
  row_id := coalesce(new.id, old.id); actor := auth.uid();
  insert into public.audit_log(actor_id, action, entity_type, entity_id, metadata)
  values(actor, lower(tg_op), tg_table_name, row_id, jsonb_build_object('source','database'));
  return coalesce(new, old);
end;
$$;

create trigger audit_albums after insert or update or delete on public.albums for each row execute function public.audit_content_change();
create trigger audit_tracks after insert or update or delete on public.tracks for each row execute function public.audit_content_change();
create trigger audit_episodes after insert or update or delete on public.episodes for each row execute function public.audit_content_change();
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit_content_change();
create trigger audit_media after insert or update or delete on public.media_assets for each row execute function public.audit_content_change();

alter table public.profiles enable row level security;
alter table public.admin_invites enable row level security;
alter table public.media_assets enable row level security;
alter table public.albums enable row level security;
alter table public.tracks enable row level security;
alter table public.episodes enable row level security;
alter table public.episode_chapters enable row level security;
alter table public.episode_themes enable row level security;
alter table public.products enable row level security;
alter table public.product_items enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.download_entitlements enable row level security;
alter table public.download_events enable row level security;
alter table public.refunds enable row level security;
alter table public.refund_items enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.site_settings enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_log enable row level security;

create policy profiles_self_or_staff_select on public.profiles for select to authenticated
using (id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]));
revoke update on public.profiles from authenticated;
grant update(full_name, avatar_url, updated_at) on public.profiles to authenticated;
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy invites_staff_select on public.admin_invites for select to authenticated using (public.is_staff(array['owner','admin']::public.user_role[]));
create policy media_public_select on public.media_assets for select to anon, authenticated using (
  bucket = 'public-media' and processing_status = 'ready'
  or public.is_staff(array['owner','admin','editor']::public.user_role[])
  or exists(
    select 1 from public.download_entitlements de
    where de.media_asset_id = media_assets.id and de.user_id = auth.uid() and de.revoked_at is null
  )
);
create policy media_staff_insert on public.media_assets for insert to authenticated with check (public.is_staff(array['owner','admin','editor']::public.user_role[]) and created_by = auth.uid());
create policy media_staff_update on public.media_assets for update to authenticated using (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.media_is_locked(id))
) with check (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.media_is_locked(id))
);
create policy media_staff_delete on public.media_assets for delete to authenticated using (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.media_is_locked(id))
);

create policy albums_public_or_staff_select on public.albums for select to anon, authenticated using (status = 'published' and published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]));
create policy albums_content_insert on public.albums for insert to authenticated with check (public.can_write_content(status));
create policy albums_content_update on public.albums for update to authenticated using (public.can_write_content(status)) with check (public.can_write_content(status));
create policy albums_content_delete on public.albums for delete to authenticated using (public.can_write_content(status));

create policy tracks_public_or_staff_select on public.tracks for select to anon, authenticated using (status = 'published' and exists(select 1 from public.albums a where a.id = album_id and a.status = 'published' and a.published_at <= now()) or public.is_staff(array['owner','admin','editor']::public.user_role[]));
create policy tracks_content_insert on public.tracks for insert to authenticated with check (public.can_write_content(status));
create policy tracks_content_update on public.tracks for update to authenticated using (public.can_write_content(status)) with check (public.can_write_content(status));
create policy tracks_content_delete on public.tracks for delete to authenticated using (public.can_write_content(status));

create policy episodes_public_or_staff_select on public.episodes for select to anon, authenticated using (status = 'published' and published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]));
create policy episodes_content_insert on public.episodes for insert to authenticated with check (public.can_write_content(status));
create policy episodes_content_update on public.episodes for update to authenticated using (public.can_write_content(status)) with check (public.can_write_content(status));
create policy episodes_content_delete on public.episodes for delete to authenticated using (public.can_write_content(status));

create policy episode_children_select on public.episode_chapters for select to anon, authenticated using (exists(select 1 from public.episodes e where e.id = episode_id and (e.status = 'published' and e.published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]))));
create policy episode_children_write on public.episode_chapters for all to authenticated using (
  exists(select 1 from public.episodes e where e.id = episode_id and public.can_write_content(e.status))
) with check (
  exists(select 1 from public.episodes e where e.id = episode_id and public.can_write_content(e.status))
);
create policy episode_themes_select on public.episode_themes for select to anon, authenticated using (exists(select 1 from public.episodes e where e.id = episode_id and (e.status = 'published' and e.published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]))));
create policy episode_themes_write on public.episode_themes for all to authenticated using (
  exists(select 1 from public.episodes e where e.id = episode_id and public.can_write_content(e.status))
) with check (
  exists(select 1 from public.episodes e where e.id = episode_id and public.can_write_content(e.status))
);

create policy products_public_or_staff_select on public.products for select to anon, authenticated using (status = 'published' and published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]));
create policy products_content_insert on public.products for insert to authenticated with check (public.can_write_content(status));
create policy products_content_update on public.products for update to authenticated using (public.can_write_content(status)) with check (public.can_write_content(status));
create policy products_content_delete on public.products for delete to authenticated using (public.can_write_content(status));
create policy product_items_public_or_staff_select on public.product_items for select to anon, authenticated using (exists(select 1 from public.products p where p.id = product_id and (p.status = 'published' and p.published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]))));
create policy product_items_staff_write on public.product_items for all to authenticated using (
  exists(select 1 from public.products p where p.id = product_id and public.can_write_content(p.status))
) with check (
  exists(select 1 from public.products p where p.id = product_id and public.can_write_content(p.status))
);

create policy carts_owner_all on public.carts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_owner_all on public.cart_items for all to authenticated using (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())) with check (exists(select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy orders_owner_or_staff_select on public.orders for select to authenticated using (user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]));
create policy order_items_owner_or_staff_select on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]))));
create policy entitlements_owner_or_staff_select on public.download_entitlements for select to authenticated using (user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]));
create policy download_events_owner_or_staff_select on public.download_events for select to authenticated using (user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]));
create policy refunds_owner_or_staff_select on public.refunds for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]))));
create policy refund_items_owner_or_staff_select on public.refund_items for select to authenticated using (exists(select 1 from public.refunds r join public.orders o on o.id = r.order_id where r.id = refund_id and (o.user_id = auth.uid() or public.is_staff(array['owner','admin','support']::public.user_role[]))));

create policy contact_staff_select on public.contact_messages for select to authenticated using (public.is_staff(array['owner','admin','support']::public.user_role[]));
create policy contact_staff_update on public.contact_messages for update to authenticated using (public.is_staff(array['owner','admin','support']::public.user_role[])) with check (public.is_staff(array['owner','admin','support']::public.user_role[]));
create policy newsletter_public_insert on public.newsletter_subscribers for insert to anon, authenticated with check (status = 'subscribed');
create policy newsletter_staff_select on public.newsletter_subscribers for select to authenticated using (public.is_staff(array['owner','admin']::public.user_role[]));
create policy settings_public_or_staff_select on public.site_settings for select to anon, authenticated using (is_public or public.is_staff(array['owner','admin']::public.user_role[]));
create policy settings_admin_write on public.site_settings for all to authenticated using (public.is_staff(array['owner','admin']::public.user_role[])) with check (public.is_staff(array['owner','admin']::public.user_role[]));
create policy audit_admin_select on public.audit_log for select to authenticated using (public.is_staff(array['owner','admin']::public.user_role[]));

insert into storage.buckets(id, name, public, file_size_limit) values
  ('public-media','public-media',true,5368709120),
  ('private-downloads','private-downloads',false,5368709120),
  ('source-media','source-media',false,5368709120)
on conflict(id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

create policy storage_public_reads on storage.objects for select to anon, authenticated using (bucket_id = 'public-media' or public.is_staff(array['owner','admin','editor']::public.user_role[]));
create policy storage_staff_inserts on storage.objects for insert to authenticated with check (bucket_id in ('public-media','private-downloads','source-media') and public.is_staff(array['owner','admin','editor']::public.user_role[]) and (storage.foldername(name))[1] = auth.uid()::text);
create policy storage_staff_updates on storage.objects for update to authenticated using (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.storage_object_is_locked(bucket_id, name))
) with check (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.storage_object_is_locked(bucket_id, name))
);
create policy storage_staff_deletes on storage.objects for delete to authenticated using (
  public.is_staff(array['owner','admin','editor']::public.user_role[])
  and (public.current_user_role() <> 'editor' or not public.storage_object_is_locked(bucket_id, name))
);

grant usage on schema public to anon, authenticated;
grant select on public.albums, public.tracks, public.episodes, public.episode_chapters, public.episode_themes, public.products, public.product_items, public.media_assets, public.site_settings to anon;
grant insert on public.newsletter_subscribers to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke update on public.profiles from authenticated;
grant update(full_name, avatar_url, updated_at) on public.profiles to authenticated;
grant execute on function public.current_user_role(), public.is_staff(public.user_role[]), public.can_write_content(public.publish_status) to anon, authenticated;
grant execute on function public.media_is_locked(uuid) to authenticated;
grant execute on function public.storage_object_is_locked(text, text) to authenticated;
revoke all on function public.publish_scheduled_content() from public, anon, authenticated;
