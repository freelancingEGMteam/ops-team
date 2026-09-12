-- Consolidates the three "Hymns of Faith Vol. 1" products into one product
-- with three purchasable variants, following 202609120003:
--
--   Hymns of Faith Vol. 1              -> MP3 Album          (survivor)
--   Chord Sheet - Hymns of Faith Vol.1 -> Chord Sheet
--   Hymns of Faith Vol. 1 + Chord S..  -> MP3 + Chord Sheet
--
-- The merged_into_product_id column and the retired-product select policy
-- already exist, so this only moves data. Order history, entitlements, and
-- Stripe prices key off variant id and carry over untouched; the absorbed
-- products are archived rather than deleted so their URLs keep redirecting.

do $$
declare
  survivor uuid;
  chords uuid;
  bundle uuid;
begin
  select id into survivor from public.products where slug = 'hymns-of-faith-vol-1-f7746b7f';
  select id into chords   from public.products where slug = 'chord-sheet-hymns-of-faith-vol-1-04fc2b2b';
  select id into bundle   from public.products where slug = 'hymns-of-faith-vol-1-chord-sheet-759ad0a9';

  if survivor is null or chords is null or bundle is null then
    raise exception 'Hymns of Faith consolidation aborted: survivor=%, chords=%, bundle=%', survivor, chords, bundle;
  end if;

  if (select count(*) from public.product_variants where product_id = chords) <> 1
     or (select count(*) from public.product_variants where product_id = bundle) <> 1 then
    raise exception 'Hymns of Faith consolidation aborted: absorbed products must have exactly one variant each';
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
