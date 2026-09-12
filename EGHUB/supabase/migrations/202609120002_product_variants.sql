-- Introduces real product variants: one parent `products` row can now offer
-- several purchasable options (e.g. MP3 / Chords / MP3+Chords bundle), each
-- with its own price, Stripe price, and set of downloadable files, instead of
-- needing a separate flat `products` row per combination.
--
-- Every existing product is preserved exactly as-is (same id/slug/URL) and
-- automatically gets exactly one variant carrying over its current
-- kind/price/Stripe price id, so nothing about today's live catalog changes
-- for customers. Staff can add more variants to a product, or consolidate
-- several existing products into one parent + variants, later via the admin
-- UI — this migration does not attempt to auto-merge anything.

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text,
  kind public.product_kind not null,
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd' check (currency = 'usd'),
  stripe_price_id text unique,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants(product_id, sort_order);
create trigger product_variants_updated before update on public.product_variants for each row execute function public.set_updated_at();
alter table public.product_variants enable row level security;

-- One variant per existing product, carrying over its current purchasable
-- attributes unchanged.
insert into public.product_variants (product_id, label, kind, price_cents, currency, stripe_price_id, is_active, sort_order)
select id, null, kind, price_cents, currency, stripe_price_id, true, 0
from public.products;

create policy product_variants_public_or_staff_select on public.product_variants for select to anon, authenticated using (
  (is_active and exists(select 1 from public.products p where p.id = product_id and p.status = 'published' and p.published_at <= now()))
  or public.is_staff(array['owner','admin','editor']::public.user_role[])
);
create policy product_variants_staff_write on public.product_variants for all to authenticated using (
  exists(select 1 from public.products p where p.id = product_id and public.can_write_content(p.status))
) with check (
  exists(select 1 from public.products p where p.id = product_id and public.can_write_content(p.status))
);

grant select on public.product_variants to anon;
grant select, insert, update, delete on public.product_variants to authenticated;

-- product_items now belongs to a variant (its own file set per option),
-- not directly to the parent product. Drop and recreate its RLS policies
-- first since they reference product_id, which is about to disappear.
drop policy if exists product_items_public_or_staff_select on public.product_items;
drop policy if exists product_items_staff_write on public.product_items;

alter table public.product_items add column variant_id uuid references public.product_variants(id) on delete cascade;
update public.product_items pi
set variant_id = pv.id
from public.product_variants pv
where pv.product_id = pi.product_id;
alter table public.product_items alter column variant_id set not null;
alter table public.product_items drop column product_id cascade;
alter table public.product_items add constraint product_items_variant_media_unique unique (variant_id, media_asset_id);

create policy product_items_public_or_staff_select on public.product_items for select to anon, authenticated using (
  exists(
    select 1 from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = variant_id and (p.status = 'published' and p.published_at <= now() or public.is_staff(array['owner','admin','editor']::public.user_role[]))
  )
);
create policy product_items_staff_write on public.product_items for all to authenticated using (
  exists(
    select 1 from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = variant_id and public.can_write_content(p.status)
  )
) with check (
  exists(
    select 1 from public.product_variants pv
    join public.products p on p.id = pv.product_id
    where pv.id = variant_id and public.can_write_content(p.status)
  )
);

-- Cart lines and order lines move to variant_id too: a shopper can hold two
-- different variants of the same parent product as separate lines, and a
-- paid order can contain more than one variant of the same product.
alter table public.cart_items add column variant_id uuid references public.product_variants(id);
update public.cart_items ci
set variant_id = pv.id
from public.product_variants pv
where pv.product_id = ci.product_id;
alter table public.cart_items alter column variant_id set not null;
alter table public.cart_items drop column product_id cascade;
alter table public.cart_items add constraint cart_items_cart_variant_unique unique (cart_id, variant_id);

alter table public.order_items add column variant_id uuid references public.product_variants(id) on delete set null;
update public.order_items oi
set variant_id = pv.id
from public.product_variants pv
where pv.product_id = oi.product_id;
-- Dropping product_id also drops the order_items_order_product_unique
-- constraint added in 202609120001_order_item_idempotency.sql, since it was
-- keyed on product_id.
alter table public.order_items drop column product_id cascade;
alter table public.order_items add constraint order_items_order_variant_unique unique (order_id, variant_id);

-- Purchasable attributes (kind/price/Stripe price) now live only on
-- product_variants. products keeps stripe_product_id + stripe_tax_code —
-- one Stripe Product and tax setting shared by all of a product's variant
-- Prices, matching how Stripe Tax actually attaches to the Product object.
alter table public.products
  drop column kind cascade,
  drop column price_cents cascade,
  drop column stripe_price_id cascade;

-- A protected file is locked from deletion/replacement while it's attached
-- to a variant of a scheduled/published/archived product — same rule as
-- before, one join hop deeper.
create or replace function public.media_is_locked(asset_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select
    exists(select 1 from public.albums where status in ('scheduled','published','archived') and asset_id in (cover_asset_id, preview_asset_id))
    or exists(select 1 from public.tracks where status in ('scheduled','published','archived') and asset_id in (audio_asset_id, preview_asset_id, chord_pdf_asset_id, lyrics_pdf_asset_id))
    or exists(select 1 from public.episodes where status in ('scheduled','published','archived') and asset_id in (hero_video_asset_id, poster_asset_id))
    or exists(select 1 from public.products where status in ('scheduled','published','archived') and cover_asset_id = asset_id)
    or exists(
      select 1 from public.product_items pi
      join public.product_variants pv on pv.id = pi.variant_id
      join public.products p on p.id = pv.product_id
      where pi.media_asset_id = asset_id and p.status in ('scheduled','published','archived')
    );
$$;
