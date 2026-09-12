begin;
select plan(58);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'download_entitlements', 'download entitlements exist');
select has_table('public', 'webhook_events', 'webhook event ledger exists');
select has_enum('public', 'user_role', 'role enum exists');
select enum_has_labels('public', 'user_role', array['owner','admin','editor','support','customer'], 'role labels are locked');
select has_function('public', 'current_user_role', 'current user role helper exists');
select has_function('public', 'is_staff', 'staff role helper exists');
select has_function('public', 'can_write_content', 'publishing permission helper exists');

select row_security_active('public', table_name, table_name || ' RLS is active')
from unnest(array[
  'profiles', 'admin_invites', 'media_assets', 'albums', 'tracks', 'episodes',
  'episode_chapters', 'episode_themes', 'products', 'product_variants',
  'product_items', 'carts',
  'cart_items', 'orders', 'order_items', 'download_entitlements', 'download_events',
  'refunds', 'refund_items', 'contact_messages', 'newsletter_subscribers',
  'site_settings', 'webhook_events', 'audit_log'
]) as table_name;
select row_security_active('storage', 'objects', 'storage objects RLS is active');

insert into auth.users(id, email) values
  ('10000000-0000-0000-0000-000000000001', 'owner@example.test'),
  ('20000000-0000-0000-0000-000000000002', 'admin@example.test'),
  ('30000000-0000-0000-0000-000000000003', 'editor@example.test'),
  ('40000000-0000-0000-0000-000000000004', 'support@example.test'),
  ('50000000-0000-0000-0000-000000000005', 'customer-one@example.test'),
  ('60000000-0000-0000-0000-000000000006', 'customer-two@example.test');

update public.profiles set role = 'owner' where id = '10000000-0000-0000-0000-000000000001';
update public.profiles set role = 'admin' where id = '20000000-0000-0000-0000-000000000002';
update public.profiles set role = 'editor' where id = '30000000-0000-0000-0000-000000000003';
update public.profiles set role = 'support' where id = '40000000-0000-0000-0000-000000000004';

insert into public.media_assets(id, bucket, path, kind, title, processing_status, created_by) values
  ('70000000-0000-0000-0000-000000000001', 'public-media', 'fixtures/cover.jpg', 'cover', 'Public cover', 'ready', '10000000-0000-0000-0000-000000000001'),
  ('70000000-0000-0000-0000-000000000002', 'private-downloads', 'fixtures/album.zip', 'bundle', 'Private bundle', 'ready', '10000000-0000-0000-0000-000000000001');
insert into public.albums(id, slug, title, status, published_at, cover_asset_id) values
  ('71000000-0000-0000-0000-000000000001', 'published-album', 'Published album', 'published', now() - interval '1 day', '70000000-0000-0000-0000-000000000001'),
  ('71000000-0000-0000-0000-000000000002', 'draft-album', 'Draft album', 'draft', null, null);
insert into public.albums(id, slug, title, status, scheduled_for) values
  ('71000000-0000-0000-0000-000000000003', 'scheduled-album', 'Scheduled album', 'scheduled', now() - interval '1 minute');
insert into public.products(id, slug, title, status, published_at) values
  ('72000000-0000-0000-0000-000000000001', 'free-resource', 'Free resource', 'published', now() - interval '1 day'),
  ('72000000-0000-0000-0000-000000000002', 'draft-resource', 'Draft resource', 'draft', null);
insert into public.product_variants(id, product_id, kind, price_cents) values
  ('72500000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'free', 0),
  ('72500000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000002', 'free', 0);
insert into public.product_items(variant_id, media_asset_id) values
  ('72500000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002');
insert into public.orders(id, order_number, user_id, email, status) values
  ('73000000-0000-0000-0000-000000000001', 'EGH-TEST-1', '50000000-0000-0000-0000-000000000005', 'customer-one@example.test', 'paid'),
  ('73000000-0000-0000-0000-000000000002', 'EGH-TEST-2', '60000000-0000-0000-0000-000000000006', 'customer-two@example.test', 'paid');
insert into public.order_items(id, order_id, variant_id, title_snapshot, price_cents_snapshot) values
  ('74000000-0000-0000-0000-000000000001', '73000000-0000-0000-0000-000000000001', '72500000-0000-0000-0000-000000000001', 'Free resource', 0);
insert into public.download_entitlements(id, user_id, order_item_id, media_asset_id) values
  ('75000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000005', '74000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000002');
insert into public.site_settings(key, value, is_public) values
  ('public-name', '"Eternal Grace Hub"'::jsonb, true),
  ('private-ops', '"hidden"'::jsonb, false);
insert into public.webhook_events(id, provider, event_type) values ('evt_fixture', 'stripe', 'checkout.session.completed');
insert into storage.objects(bucket_id, name) values ('private-downloads', 'fixtures/album.zip');
select lives_ok($$select public.publish_scheduled_content()$$, 'due scheduled content is published automatically');

set local role anon;
select results_eq($$select count(*) from public.albums where status = 'published'$$, array[2::bigint], 'anonymous visitors see published albums');
select results_eq($$select count(*) from public.albums where status = 'draft'$$, array[0::bigint], 'anonymous visitors cannot see draft albums');
select throws_ok($$insert into public.contact_messages(email, message) values ('guest@example.test', 'This bypass should not be accepted.')$$, '42501', null, 'anonymous visitors cannot bypass the contact function');
select lives_ok($$insert into public.newsletter_subscribers(email) values ('subscriber@example.test')$$, 'anonymous visitors can subscribe');
select throws_ok($$insert into public.contact_messages(email, message, status) values ('attacker@example.test', 'This should not be accepted.', 'resolved')$$, '42501', null, 'anonymous visitors cannot forge a resolved contact');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000005', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select results_eq($$select count(*) from public.products$$, array[1::bigint], 'customers see only published products');
select results_eq($$select count(*) from public.orders$$, array[1::bigint], 'customers see only their own orders');
select results_eq($$select count(*) from public.download_entitlements$$, array[1::bigint], 'customers see their own entitlements');
select results_eq($$select count(*) from public.media_assets where bucket = 'private-downloads'$$, array[1::bigint], 'customers can read metadata for entitled private media');
select results_eq($$select count(*) from storage.objects where bucket_id = 'private-downloads'$$, array[0::bigint], 'customers cannot retrieve private files directly');
select results_eq($$select count(*) from public.site_settings$$, array[1::bigint], 'customers see only public settings');
select results_eq($$select count(*) from public.audit_log$$, array[0::bigint], 'customers cannot see audit history');
select results_eq($$select count(*) from public.webhook_events$$, array[0::bigint], 'customers cannot read webhook payloads');
select throws_ok($$update public.profiles set role = 'owner' where id = '50000000-0000-0000-0000-000000000005'$$, '42501', null, 'customers cannot promote themselves');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000003', true);
select results_eq($$select count(*) from public.albums where status = 'draft'$$, array[1::bigint], 'editors can see draft content');
select results_eq($$select count(*) from public.orders$$, array[0::bigint], 'editors cannot see payment data');
select lives_ok($$insert into public.albums(slug, title, status) values ('editor-draft', 'Editor draft', 'draft')$$, 'editors can create drafts');
select throws_ok($$insert into public.albums(slug, title, status, published_at) values ('editor-published', 'Forbidden publish', 'published', now())$$, '42501', null, 'editors cannot publish');
select results_eq($$with changed as (update public.albums set title = 'Changed live title' where slug = 'published-album' returning 1) select count(*) from changed$$, array[0::bigint], 'editors cannot alter or unpublish live content');
select results_eq($$with removed as (delete from public.media_assets where id = '70000000-0000-0000-0000-000000000001' returning 1) select count(*) from removed$$, array[0::bigint], 'editors cannot delete media attached to live content');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000004', true);
select results_eq($$select count(*) from public.orders$$, array[2::bigint], 'support can see customer orders');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select lives_ok($$insert into public.albums(slug, title, status, published_at) values ('admin-published', 'Admin publication', 'published', now())$$, 'admins can publish');
select results_eq($$select count(*) from public.site_settings$$, array[2::bigint], 'admins can see private operational settings');
select results_eq($$select count(*) > 0 from public.audit_log$$, array[true], 'admins can see audit history');

select * from finish();
rollback;
