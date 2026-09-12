import Stripe from "npm:stripe@22.6.1";
import { z } from "npm:zod@4.5.4";
import {
  functionError,
  handleOptions,
  json,
  readJson,
} from "../_shared/http.ts";
import { audit, requireStaff } from "../_shared/auth.ts";
import { sendEmail } from "../_shared/email.ts";

const bodySchema = z.object({
  orderId: z.string().uuid(),
  orderItemIds: z.array(z.string().uuid()).min(1),
  reason: z.string().trim().min(1).max(500).optional(),
});

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  try {
    const { user, admin } = await requireStaff(req, [
      "owner",
      "admin",
      "support",
    ]);
    const { orderId, orderItemIds, reason } = await readJson(req, bodySchema);
    const { data: order } = await admin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (
      !order?.stripe_payment_intent_id ||
      !["paid", "partially_refunded"].includes(order.status)
    )
      return json(req, { error: "Order cannot be refunded" }, 409);
    const { data: items } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId)
      .in("id", orderItemIds);
    if (!items || items.length !== new Set(orderItemIds).size)
      return json(req, { error: "Invalid order items" }, 400);
    const { data: prior } = await admin
      .from("refund_items")
      .select("order_item_id")
      .in("order_item_id", orderItemIds);
    if (prior?.length)
      return json(
        req,
        { error: "One or more selected items were already refunded" },
        409,
      );
    const { data: allItems } = await admin
      .from("order_items")
      .select("id")
      .eq("order_id", order.id);
    const allItemIds = (allItems || []).map((item) => item.id);
    const { data: alreadyRefundedItems } = allItemIds.length
      ? await admin
          .from("refund_items")
          .select("order_item_id")
          .in("order_item_id", allItemIds)
      : { data: [] };
    const { data: priorRefunds } = await admin
      .from("refunds")
      .select("amount_cents")
      .eq("order_id", order.id);
    const selectedSubtotal = items.reduce(
      (sum, item) => sum + item.price_cents_snapshot * item.quantity,
      0,
    );
    const willFullyRefund =
      new Set((alreadyRefundedItems || []).map((item) => item.order_item_id))
        .size +
        new Set(orderItemIds).size ===
      allItemIds.length;
    const previouslyRefunded = (priorRefunds || []).reduce(
      (sum, refund) => sum + refund.amount_cents,
      0,
    );
    const proportionalTax = order.subtotal_cents
      ? Math.round((order.tax_cents * selectedSubtotal) / order.subtotal_cents)
      : 0;
    const amount = willFullyRefund
      ? order.total_cents - previouslyRefunded
      : selectedSubtotal + proportionalTax;
    if (amount <= 0)
      return json(req, { error: "Refund amount is not valid" }, 409);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const stripeRefund = await stripe.refunds.create(
      {
        payment_intent: order.stripe_payment_intent_id,
        amount,
        reason: "requested_by_customer",
        metadata: {
          order_id: order.id,
          order_item_ids: orderItemIds.join(","),
          actor_id: user.id,
        },
      },
      {
        idempotencyKey: `refund-${order.id}-${[...orderItemIds].sort().join("-")}`,
      },
    );
    const { data: refund, error } = await admin
      .from("refunds")
      .upsert(
        {
          order_id: order.id,
          amount_cents: amount,
          reason: reason || null,
          stripe_refund_id: stripeRefund.id,
          created_by: user.id,
        },
        { onConflict: "stripe_refund_id" },
      )
      .select("*")
      .single();
    if (error) throw error;
    await admin.from("refund_items").upsert(
      orderItemIds.map((orderItemId) => ({
        refund_id: refund.id,
        order_item_id: orderItemId,
      })),
      { onConflict: "refund_id,order_item_id" },
    );
    await admin
      .from("download_entitlements")
      .update({
        revoked_at: new Date().toISOString(),
        revoked_reason: reason || "Refunded",
      })
      .in("order_item_id", orderItemIds);
    const { data: allRefunded } = await admin
      .from("refund_items")
      .select("order_item_id")
      .in(
        "order_item_id",
        (allItems || []).map((item) => item.id),
      );
    const status =
      allItems?.length &&
      new Set((allRefunded || []).map((item) => item.order_item_id)).size ===
        allItems.length
        ? "refunded"
        : "partially_refunded";
    const { data: updated } = await admin
      .from("orders")
      .update({ status })
      .eq("id", order.id)
      .select("*")
      .single();
    await audit(admin, user.id, "order.refunded", "orders", order.id, {
      refundId: refund.id,
      orderItemIds,
      amount,
    });
    await sendEmail(
      order.email,
      `Refund for ${order.order_number}`,
      `<h1>Your refund has been submitted</h1><p>$${(amount / 100).toFixed(2)} USD is returning to the original payment method.</p><p>Access to the refunded resources has been removed.</p>`,
    );
    return json(req, { order: updated, refund });
  } catch (error) {
    return functionError(req, error, "Refund failed");
  }
});
