-- Consolidates the three separate "Psalms 1-10" products into one product
-- with three purchasable variants, which is what the variants model was
-- built for:
--
--   Psalms 1-10 Remastered            ($10)  -> MP3 Album          (survivor)
--   Chord sheet Psalms 1-10 remake    ($10)  -> Chord Sheet
--   Psalms 1-10 Remastered + Chord... ($20)  -> MP3 + Chord Sheet
--
-- Order history, download entitlements, and Stripe prices all key off
-- variant id, so re-parenting a variant carries them along untouched. The
-- absorbed products are archived rather than deleted and left pointing at
-- their replacement, so their existing URLs redirect instead of 404ing.

alter table public.products
  add column merged_into_product_id uuid references public.products(id) on delete set null;

-- A retired product must stay publicly readable for its URL to resolve to a
-- redirect. Catalog listings and product pages both filter on
-- status = 'published', so archived rows still never render as products.
drop policy if exists products_public_or_staff_select on public.products;
create policy products_public_or_staff_select on public.products for select to anon, authenticated using (
  (status = 'published' and published_at <= now())
  or merged_into_product_id is not null
  or public.is_staff(array['owner','admin','editor']::public.user_role[])
);

do $$
declare
  survivor uuid;
  chords uuid;
  bundle uuid;
begin
  select id into survivor from public.products where slug = 'psalms-1-10-remastered-2ad16db6';
  select id into chords   from public.products where slug = 'chord-sheet-psalms-1-10-remake-0724a9ee';
  select id into bundle   from public.products where slug = 'psalms-1-10-remastered-chord-sheet-ec266398';

  if survivor is null or chords is null or bundle is null then
    raise exception 'Psalms 1-10 consolidation aborted: survivor=%, chords=%, bundle=%', survivor, chords, bundle;
  end if;

  -- Each product currently carries exactly one variant from the backfill in
  -- 202609120002. Fail loudly rather than silently merging a partial set.
  if (select count(*) from public.product_variants where product_id = chords) <> 1
     or (select count(*) from public.product_variants where product_id = bundle) <> 1 then
    raise exception 'Psalms 1-10 consolidation aborted: absorbed products must have exactly one variant each';
  end if;

  update public.product_variants
     set label = 'MP3 Album', sort_order = 0
   where product_id = survivor and label is null;

  update public.product_variants
     set product_id = survivor, label = 'Chord Sheet', sort_order = 1
   where product_id = chords;

  update public.product_variants
     set product_id = survivor, label = 'MP3 + Chord Sheet', sort_order = 2
   where product_id = bundle;

  update public.products
     set status = 'archived',
         scheduled_for = null,
         merged_into_product_id = survivor
   where id in (chords, bundle);
end $$;
