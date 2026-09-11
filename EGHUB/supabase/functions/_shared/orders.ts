import type { SupabaseClient } from "npm:@supabase/supabase-js@2.114.0";
import { audit } from "./auth.ts";
import { receiptHtml, sendEmail } from "./email.ts";

export function orderNumber() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `EGH-${date}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function fulfillOrder(
  admin: SupabaseClient,
  input: {
    userId: string;
    email: string;
    products: Array<{
      id: string;
      title: string;
      price_cents: number;
      quantity: number;
    }>;
    subtotalCents: number;
    taxCents: number;
    totalCents: number;
    stripeSessionId?: string | null;
    stripePaymentIntentId?: string | null;
  },
) {
  if (input.stripeSessionId) {
    const { data: existing } = await admin
      .from("orders")
      .select("*")
      .eq("stripe_checkout_session_id", input.stripeSessionId)
      .maybeSingle();
    if (existing) return existing;
  }
  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber(),
      user_id: input.userId,
      email: input.email,
      status: "paid",
      subtotal_cents: input.subtotalCents,
      tax_cents: input.taxCents,
      total_cents: input.totalCents,
      currency: "usd",
      stripe_checkout_session_id: input.stripeSessionId || null,
      stripe_payment_intent_id: input.stripePaymentIntentId || null,
    })
    .select("*")
    .single();
  if (orderError) throw orderError;
  for (const product of input.products) {
    const { data: item, error: itemError } = await admin
      .from("order_items")
      .insert({
        order_id: order.id,
        product_id: product.id,
        title_snapshot: product.title,
        price_cents_snapshot: product.price_cents,
        quantity: product.quantity,
      })
      .select("*")
      .single();
    if (itemError) throw itemError;
    const { data: assets, error: assetsError } = await admin
      .from("product_items")
      .select("media_asset_id")
      .eq("product_id", product.id);
    if (assetsError) throw assetsError;
    if (assets?.length) {
      const { error } = await admin.from("download_entitlements").upsert(
        assets.map((asset) => ({
          user_id: input.userId,
          order_item_id: item.id,
          media_asset_id: asset.media_asset_id,
        })),
        { onConflict: "user_id,order_item_id,media_asset_id" },
      );
      if (error) throw error;
    }
  }
  await audit(admin, input.userId, "order.fulfilled", "orders", order.id, {
    stripeSessionId: input.stripeSessionId || null,
  });
  const site = Deno.env.get("SITE_URL") || "http://localhost:4321";
  try {
    await sendEmail(
      input.email,
      `Your Eternal Grace Hub order ${order.order_number}`,
      receiptHtml(order, `${site}/account/downloads`),
    );
  } catch (error) {
    console.error("Receipt delivery failed", { orderId: order.id, error });
    await audit(
      admin,
      input.userId,
      "receipt.delivery_failed",
      "orders",
      order.id,
    );
  }
  return order;
}
