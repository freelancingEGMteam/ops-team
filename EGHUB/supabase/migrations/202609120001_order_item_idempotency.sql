-- Order fulfillment (Stripe webhook + free-product claim) must be safe to
-- retry after a partial failure or a duplicate event delivery. This
-- constraint lets fulfillOrder() upsert order_items by (order_id,
-- product_id) instead of blindly inserting, so a resumed fulfillment run
-- can't create two line items for the same product on the same order.
alter table public.order_items
  add constraint order_items_order_product_unique unique (order_id, product_id);
