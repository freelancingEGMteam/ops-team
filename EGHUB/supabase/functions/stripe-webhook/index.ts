import Stripe from "npm:stripe@22.6.1";
import { adminClient, audit } from "../_shared/auth.ts";
import { fulfillOrder } from "../_shared/orders.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      await req.text(),
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
  } catch (error) {
    console.error("Invalid Stripe signature", error);
    return new Response("Invalid signature", { status: 400 });
  }
  const admin = adminClient();
  // Atomically claim this event id before doing any work: INSERT ... ON
  // CONFLICT DO NOTHING via ignoreDuplicates, then check whether our row was
  // the one that landed. This closes the race where two concurrent
  // deliveries of the same event (Stripe does retry/duplicate delivery) both
  // read "not yet processed" and both fulfill the order. If processing below
  // throws, the claim is released in the catch block so Stripe's retry can
  // actually succeed later instead of being swallowed as a false duplicate.
  const { data: claimed, error: claimError } = await admin
    .from("webhook_events")
    .upsert(
      {
        id: event.id,
        provider: "stripe",
        event_type: event.type,
        payload: event as unknown as Record<string, unknown>,
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");
  if (claimError) {
    console.error("Failed to claim webhook event", {
      eventId: event.id,
      claimError,
    });
    return new Response("Claim failed", { status: 500 });
  }
  if (!claimed?.length)
    return Response.json({ received: true, duplicate: true });
  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (
        session.payment_status === "paid" ||
        event.type === "checkout.session.async_payment_succeeded"
      )
        await fulfillSession(admin, session);
    } else if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await audit(
        admin,
        session.metadata?.user_id || null,
        "checkout.failed",
        "carts",
        session.metadata?.cart_id || null,
        { stripeSessionId: session.id },
      );
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntent =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : charge.payment_intent?.id;
      if (paymentIntent) {
        const { data: order } = await admin
          .from("orders")
          .select("*")
          .eq("stripe_payment_intent_id", paymentIntent)
          .maybeSingle();
        if (order) {
          const full = charge.amount_refunded >= charge.amount;
          await admin
            .from("orders")
            .update({ status: full ? "refunded" : "partially_refunded" })
            .eq("id", order.id);
          if (full) {
            const { data: items } = await admin
              .from("order_items")
              .select("id")
              .eq("order_id", order.id);
            if (items?.length)
              await admin
                .from("download_entitlements")
                .update({
                  revoked_at: new Date().toISOString(),
                  revoked_reason: "Stripe refund",
                })
                .in(
                  "order_item_id",
                  items.map((item) => item.id),
                );
          }
          await audit(
            admin,
            null,
            "stripe.refund_observed",
            "orders",
            order.id,
            { full, amountRefunded: charge.amount_refunded },
          );
        }
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      error,
    });
    // Release the claim so Stripe's automatic retry of this same event id
    // isn't silently dropped as a duplicate — it genuinely wasn't processed.
    await admin.from("webhook_events").delete().eq("id", event.id);
    return new Response("Processing failed", { status: 500 });
  }
});

async function fulfillSession(
  admin: ReturnType<typeof adminClient>,
  session: Stripe.Checkout.Session,
) {
  const userId = session.metadata?.user_id;
  const cartId = session.metadata?.cart_id;
  if (!userId || !cartId) throw new Error("Checkout metadata is incomplete");
  const { data: cartItems } = await admin
    .from("cart_items")
    .select("variant_id,quantity")
    .eq("cart_id", cartId);
  if (!cartItems?.length) throw new Error("Checkout cart is empty");
  const { data: variants } = await admin
    .from("product_variants")
    .select("id,label,price_cents,products(title)")
    .in(
      "id",
      cartItems.map((item) => item.variant_id),
    );
  if (!variants || variants.length !== cartItems.length)
    throw new Error("Checkout products are missing");
  const quantities = new Map(
    cartItems.map((item) => [item.variant_id, item.quantity]),
  );
  const variantLines = variants.map((variant: any) => ({
    id: variant.id,
    title: variant.label
      ? `${variant.products?.title} — ${variant.label}`
      : (variant.products?.title as string),
    price_cents: variant.price_cents as number,
    quantity: quantities.get(variant.id) || 1,
  }));
  const subtotal = variantLines.reduce(
    (sum, variant) => sum + variant.price_cents * variant.quantity,
    0,
  );
  const paymentIntent =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;
  const { data: profile } = await admin
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();
  await fulfillOrder(admin, {
    userId,
    email: profile?.email || session.customer_details?.email || "",
    variants: variantLines,
    subtotalCents: subtotal,
    taxCents: session.total_details?.amount_tax || 0,
    totalCents: session.amount_total || subtotal,
    stripeSessionId: session.id,
    stripePaymentIntentId: paymentIntent || null,
  });
  await admin.from("carts").update({ status: "converted" }).eq("id", cartId);
}
